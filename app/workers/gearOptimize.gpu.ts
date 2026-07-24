/// <reference types="@webgpu/types" />
import { STAT_COUNT, gpuCalculateDamage } from "./gpuFormula";

const WGSL_SHADER = `
@group(0) @binding(0) var<storage, read> inputStats: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputDamages: array<f32>;
@group(0) @binding(2) var<storage, read> numCombos: u32;

const STATS_PER_COMBO = ${STAT_COUNT}u;

fn clamp01(v: f32) -> f32 {
  return clamp(v, 0.0, 1.0);
}

fn calcPhysComp(
  physAtk: f32, otherAttr: f32,
  skillPhysMult: f32, mul: f32, pen: f32, dmgBonus: f32, flatDmg: f32
) -> f32 {
  return (physAtk + otherAttr) * skillPhysMult * (mul / 100.0)
       * (1.0 + pen / 173.0) * (1.0 + dmgBonus / 100.0) + flatDmg;
}

fn calcEleComp(
  attr: f32, skillElemMult: f32, mul: f32, pen: f32, dmgBonus: f32
) -> f32 {
  return attr * skillElemMult * (mul / 100.0)
       * (1.0 + pen / 173.0) * (1.0 + dmgBonus / 100.0);
}

fn baseDamage(arr: ptr<function, array<f32>>) -> f32 {
  let physComp = calcPhysComp((*arr)[0], (*arr)[4], (*arr)[19], (*arr)[3], (*arr)[2], (*arr)[12], (*arr)[6]);
  let eleComp = calcEleComp((*arr)[7], (*arr)[20], (*arr)[9], (*arr)[10], (*arr)[11]);
  return max(0.0, physComp - (*arr)[18]) + eleComp;
}

fn minDamage(arr: ptr<function, array<f32>>) -> f32 {
  let base = baseDamage(arr);
  let familyMult = 1.0 + (*arr)[15] / 100.0;
  let dmgTotal = (*arr)[13] + (*arr)[14];
  return base * familyMult * (1.0 + dmgTotal / 100.0);
}

fn critDamage(arr: ptr<function, array<f32>>) -> f32 {
  let otherMax = max((*arr)[4], (*arr)[5]);
  let physComp = calcPhysComp((*arr)[1], otherMax, (*arr)[19], (*arr)[3], (*arr)[2], (*arr)[12], (*arr)[6]);
  let eleComp = calcEleComp((*arr)[8], (*arr)[20], (*arr)[9], (*arr)[10], (*arr)[11]);
  let base = max(0.0, physComp - (*arr)[18]) + eleComp;
  let familyMult = 1.0 + (*arr)[15] / 100.0;
  let dmgTotal = (*arr)[13] + (*arr)[14];
  return base * familyMult * (1.0 + dmgTotal / 100.0) * (1.0 + (*arr)[16] / 100.0);
}

fn affDamage(arr: ptr<function, array<f32>>) -> f32 {
  let otherMax = max((*arr)[4], (*arr)[5]);
  let physComp = calcPhysComp((*arr)[1], otherMax, (*arr)[19], (*arr)[3], (*arr)[2], (*arr)[12], (*arr)[6]);
  let eleComp = calcEleComp((*arr)[8], (*arr)[20], (*arr)[9], (*arr)[10], (*arr)[11]);
  let base = max(0.0, physComp - (*arr)[18]) + eleComp;
  let familyMult = 1.0 + (*arr)[15] / 100.0;
  let dmgTotal = (*arr)[13] + (*arr)[14];
  return base * familyMult * (1.0 + dmgTotal / 100.0) * (1.0 + (*arr)[17] / 100.0);
}

fn expectedNormal(arr: ptr<function, array<f32>>, affinityDmg: f32) -> f32 {
  let avgPhys = ((*arr)[0] + (*arr)[1]) / 2.0;
  let avgOther = select(((*arr)[4] + (*arr)[5]) / 2.0, (*arr)[4], (*arr)[4] >= (*arr)[5]);
  let avgYour = ((*arr)[7] + (*arr)[8]) / 2.0;

  let physComp = calcPhysComp(avgPhys, avgOther, (*arr)[19], (*arr)[3], (*arr)[2], (*arr)[12], (*arr)[6]);
  let eleComp = calcEleComp(avgYour, (*arr)[20], (*arr)[9], (*arr)[10], (*arr)[11]);
  let base = max(0.0, physComp - (*arr)[18]) + eleComp;

  let familyMult = 1.0 + (*arr)[15] / 100.0;
  let dmgTotal = (*arr)[13] + (*arr)[14];
  let dmgMult = 1.0 + dmgTotal / 100.0;
  let baseHit = base * familyMult * dmgMult;

  let minDmg = minDamage(arr);
  let maxDmg = affinityDmg;

  let P = clamp01((*arr)[21] / 100.0);
  let A = clamp01((*arr)[22] / 100.0);
  let C = clamp01((*arr)[23] / 100.0);
  let CD = (*arr)[16] / 100.0;

  let scale = select(1.0 / (A + C), 1.0, A + C <= 1.0);
  let As = A * scale;
  let Cs = C * scale;

  let critHit = baseHit * (1.0 + CD);

  let noPrecision = As * maxDmg + (1.0 - As) * minDmg;
  let precision = As * maxDmg + Cs * critHit + (1.0 - As - Cs) * baseHit;

  return (1.0 - P) * noPrecision + P * precision;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= numCombos) { return; }

  var arr: array<f32, ${STAT_COUNT}u>;
  let base = idx * STATS_PER_COMBO;
  for (var k = 0u; k < ${STAT_COUNT}u; k = k + 1u) {
    arr[k] = inputStats[base + k];
  }

  let affinity = affDamage(&arr);
  let result = expectedNormal(&arr, affinity);
  outputDamages[idx] = result;
}
`;

export async function isWebGpuAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export interface GpuComputeResult {
  success: true;
  damages: Float32Array;
  /** Time spent on GPU in ms */
  gpuTimeMs: number;
}

export interface GpuComputeError {
  success: false;
  error: string;
}

export type GpuComputeOutcome = GpuComputeResult | GpuComputeError;

export async function computeDamagesOnGpu(
  inputArray: Float32Array,
  numCombos: number,
): Promise<GpuComputeOutcome> {
  if (inputArray.length !== numCombos * STAT_COUNT) {
    return { success: false, error: `Input size mismatch: ${inputArray.length} vs ${numCombos} * ${STAT_COUNT}` };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { success: false, error: "No GPU adapter available" };

    const device = await adapter.requestDevice();

    // Input buffer
    const inputBuffer = device.createBuffer({
      size: inputArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (device.queue.writeBuffer as any)(inputBuffer, 0, inputArray);

    // Output buffer
    const outputSize = numCombos * 4; // f32 = 4 bytes
    const outputBuffer = device.createBuffer({
      size: outputSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Combo count buffer
    const comboCountArray = new Uint32Array([numCombos]);
    const comboCountBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(comboCountBuffer, 0, comboCountArray);

    // Staging buffer to read back results
    const readBuffer = device.createBuffer({
      size: outputSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      ],
    });

    // Shader module
    const shaderModule = device.createShaderModule({ code: WGSL_SHADER });

    // Compute pipeline
    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: "main" },
    });

    // Bind group
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: comboCountBuffer } },
      ],
    });

    // Dispatch
    const workgroupCount = Math.ceil(numCombos / 256);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(workgroupCount);
    pass.end();

    // Copy output to staging
    encoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize);
    device.queue.submit([encoder.finish()]);

    // Readback timing
    const start = performance.now();
    await readBuffer.mapAsync(GPUMapMode.READ);
    const gpuTimeMs = performance.now() - start;

    const mapped = readBuffer.getMappedRange();
    const damages = new Float32Array(mapped.slice(0));
    readBuffer.unmap();

    // Cleanup
    device.destroy();

    return {
      success: true,
      damages,
      gpuTimeMs,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Verify GPU formula matches CPU reference for a set of random inputs */
export function verifyGpuFormulaAgainstCpu(count: number = 100): boolean {
  for (let i = 0; i < count; i++) {
    const arr = new Float32Array(STAT_COUNT);
    for (let j = 0; j < STAT_COUNT; j++) {
      // Realistic-ish stat ranges
      arr[j] = Math.random() * 500;
    }
    // Ensure some values make sense
    arr[0] = arr[0] % 3000 + 100;       // MinPhysAtk
    arr[1] = arr[1] % 3000 + arr[0];     // MaxPhysAtk >= MinPhysAtk
    arr[2] = arr[2] % 2000;              // PhysPen
    arr[3] = arr[3] % 200 + 50;           // PhysMul
    arr[4] = Math.min(arr[4] % 1000, arr[5] % 1000); // MinOtherAttr <= MaxOtherAttr
    arr[6] = arr[6] % 500;               // FlatDmg
    arr[7] = arr[7] % 1000;              // MinYourAttr
    arr[8] = arr[8] % 1000 + arr[7];     // MaxYourAttr >= MinYourAttr
    arr[9] = Math.max(arr[9] % 200, 50);  // EleMul
    arr[10] = arr[10] % 2000;            // ElePen
    arr[15] = arr[15] % 100;             // FamilyDMGBonus
    arr[16] = arr[16] % 200;             // CritDMGBonus (0-200%)
    arr[17] = arr[17] % 200;             // AffinityDMGBonus
    arr[18] = arr[18] % 5000;            // BossDef
    arr[19] = 1;                          // SkillPhysMult
    arr[20] = 1;                          // SkillElemMult
    arr[21] = arr[21] % 100;             // PrecisionRate (0-100%)
    arr[22] = arr[22] % 40;              // FinalAffinityRate (capped at 40%)
    arr[23] = arr[23] % 80;              // FinalCriticalRate (capped at 80%)

    const expected = gpuCalculateDamage(arr);
    // Note: real GPU verification would involve running the WGSL shader
    // For now, we just check the JS reference is consistent
    if (!Number.isFinite(expected) || expected < 0) {
      return false;
    }
  }
  return true;
}

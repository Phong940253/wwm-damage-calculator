export const ROTATION_SKILL_GROUPS: Array<{
  id: string;
  name: string;
  skillIds: string[];
}> = [
    {
      id: "nameless_fearless_lunge",
      name: "Fearless Lunge",
      skillIds: [
        "nameless_fearless_lunge_1",
        "nameless_fearless_lunge_2",
        "nameless_fearless_lunge_3",
      ],
    },
    {
      id: "nameless_homeless_charge",
      name: "Homeless Charge",
      skillIds: [
        "nameless_homeless_charge_1",
        "nameless_homeless_charge_2",
        "nameless_homeless_charge_3",
      ],
    },
    {
      id: "inkwell_moonlit_shatter_spring",
      name: "Moonlit Shatter Spring",
      skillIds: [
        "inkwell_moonlit_shatter_spring",
        "inkwell_moonlit_shatter_spring_enhanced",
      ],
    },
  ];

export const ROTATION_SKILL_GROUP_BY_SKILL_ID = new Map(
  ROTATION_SKILL_GROUPS.flatMap((g) => g.skillIds.map((id) => [id, g] as const)),
);

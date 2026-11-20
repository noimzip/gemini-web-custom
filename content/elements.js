const tableElements = (() => {
  const periods = [
    [[1, 1, "H"], [18, 2, "He"]],
    [[1, 3, "Li Be"], [13, 5, "B C N O F Ne"]],
    [[1, 11, "Na Mg"], [13, 13, "Al Si P S Cl Ar"]],
    [[1, 19, "K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr"]],
    [[1, 37, "Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe"]],
    [[1, 55, "Cs Ba"], [4, 72, "Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn"]],
    [[1, 87, "Fr Ra"], [4, 104, "Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"]],
    [[3, 57, "La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu"]],
    [[3, 89, "Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr"]]
  ];

  return periods.flatMap((series, index) => series.flatMap(([group, first, symbols]) =>
    symbols.split(" ").map((symbol, offset) => ({
      symbol, number: first + offset, group: group + offset, period: index + 1
    }))
  ));
})();

const modelElements = [
  {number: 1, aliases: /\bhydrogen\b|ハイドロジェン|水素/iu, color: "blue"},
  {number: 6, aliases: /\bcarbon\b|カーボン|炭素/iu, color: "violet"},
  {number: 10, aliases: /\bneon\b|ネオン/iu, color: "amber"},
  {number: 18, aliases: /\bargon\b|アルゴン/iu, color: "teal"}
];

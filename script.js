document.addEventListener("DOMContentLoaded", function () {
  const inputs = {
    year: document.getElementById("year"),
    detSize: document.getElementById("detSize"),
    cgpa: document.getElementById("cgpa"),
    pfa: document.getElementById("pfa"),
    afoqt: document.getElementById("afoqt"),
    commanderRanking: document.getElementById("commanderRanking"),
    nationalRate: document.getElementById("nationalRate"),
  };

  const results = {
    wrapper: document.getElementById("results"),
    omsResult: document.getElementById("omsResult"),
    chanceResult: document.getElementById("chanceResult"),
    omsBar: document.getElementById("omsBar"),
    chanceBar: document.getElementById("chanceBar"),
    breakdown: document.getElementById("breakdown"),
  };

  const calculateBtn = document.getElementById("calculateBtn");

  const weights = {
    gpa: 0.20,
    pfa: 0.10,
    afoqt: 0.20,
    commanderRanking: 0.45,
  };

  const commanderRankingScores = {
    top: 90,
    middle: 70,
    bottom: 45,
  };

  const commanderRankingLabels = {
    top: "Top Third",
    middle: "Middle Third",
    bottom: "Bottom Third",
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
  }

  function logit(probability) {
    return Math.log(probability / (1 - probability));
  }

  function getNumber(input, fallback) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function calculate() {
    const year = getNumber(inputs.year, 2026);
    const detSize = getNumber(inputs.detSize, 50);
    const cgpa = getNumber(inputs.cgpa, 0);
    const pfa = getNumber(inputs.pfa, 0);
    const afoqt = getNumber(inputs.afoqt, 0);
    const nationalRate = getNumber(inputs.nationalRate, 70);
    const commanderRanking = inputs.commanderRanking.value;

    const gpaScore = clamp((cgpa / 4.0) * 100, 0, 100);
    const pfaScore = clamp(pfa, 0, 100);
    const afoqtScore = clamp((afoqt / 99) * 100, 0, 100);
    const commanderScore = commanderRankingScores[commanderRanking];

    const orderOfMeritScore =
      gpaScore * weights.gpa +
      pfaScore * weights.pfa +
      afoqtScore * weights.afoqt +
      commanderScore * weights.commanderRanking;

    const baselineRate = clamp(nationalRate / 100, 0.01, 0.99);
    const slope = 0.08;
    const centeredScore = orderOfMeritScore - 70;

    const probability = clamp(
      sigmoid(logit(baselineRate) + slope * centeredScore),
      0.01,
      0.99
    );

    const orderOfMeritRounded = orderOfMeritScore.toFixed(1);
    const chanceRounded = (probability * 100).toFixed(1);

    results.wrapper.style.display = "block";
    results.omsResult.textContent = orderOfMeritRounded;
    results.chanceResult.textContent = chanceRounded + "%";

    results.omsBar.style.width = orderOfMeritRounded + "%";
    results.chanceBar.style.width = chanceRounded + "%";

    results.breakdown.innerHTML = `
      <strong>Breakdown for ${year}</strong><br><br>
      GPA Score: ${gpaScore.toFixed(1)} x 25% = ${(gpaScore * weights.gpa).toFixed(1)}<br>
      PFA Score: ${pfaScore.toFixed(1)} x 15% = ${(pfaScore * weights.pfa).toFixed(1)}<br>
      AFOQT Score: ${afoqtScore.toFixed(1)} x 20% = ${(afoqtScore * weights.afoqt).toFixed(1)}<br>
      Commander's Ranking: ${commanderRankingLabels[commanderRanking]}<br>
      Commander Ranking Score: ${commanderScore.toFixed(1)} x 40% = ${(commanderScore * weights.commanderRanking).toFixed(1)}<br><br>
      National Selection Rate Used: ${nationalRate}%<br>
      Detachment Size: ${detSize}
    `;
  }

  calculateBtn.addEventListener("click", calculate);

  Object.values(inputs).forEach(function (input) {
    input.addEventListener("input", calculate);
    input.addEventListener("change", calculate);
  });

  calculate();
});
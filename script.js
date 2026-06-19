document.addEventListener("DOMContentLoaded", function () {
  const inputs = {
    year: document.getElementById("year"),
    detSize: document.getElementById("detSize"),
    cgpa: document.getElementById("cgpa"),
    pfa: document.getElementById("pfa"),
    afoqt: document.getElementById("afoqt"),
    commanderRanking: document.getElementById("commanderRanking"),
    majorType: document.getElementById("majorType"),
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
    commanderRanking: 0.50,
  };

  const commanderRankingLabels = {
    top: "Top Third",
    middle: "Middle Third",
    bottom: "Bottom Third",
  };

  const majorTypeLabels = {
    tech: "Tech Major",
    nontech: "Non-Tech Major",
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
    if (!input) return fallback;

    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function estimateDcrRankFromTier(tier, classSize) {
    if (tier === "top") {
      return Math.ceil(classSize / 6);
    }

    if (tier === "middle") {
      return Math.ceil(classSize / 2);
    }

    return Math.ceil((5 * classSize) / 6);
  }

  function calculateRssFromEstimatedRank(tier, classSize) {
    const safeClassSize = Math.max(1, Math.round(classSize));
    const estimatedRank = estimateDcrRankFromTier(tier, safeClassSize);

    const rssScore =
      ((1 - estimatedRank / safeClassSize) + 0.5 / safeClassSize) * 100;

    return {
      estimatedRank,
      rssScore: clamp(rssScore, 0, 100),
    };
  }

  function getEaLikelihoodLabel(chance) {
    if (chance >= 85) {
      return {
        rating: "5/5",
        label: "Very likely to receive an EA",
      };
    }

    if (chance >= 70) {
      return {
        rating: "4/5",
        label: "Likely to receive an EA",
      };
    }

    if (chance >= 55) {
      return {
        rating: "3/5",
        label: "Moderate chance to receive an EA",
      };
    }

    if (chance >= 40) {
      return {
        rating: "2/5",
        label: "Not likely to receive an EA",
      };
    }

    return {
      rating: "1/5",
      label: "Unlikely to receive an EA",
    };
  }

  function calculate() {
    const year = getNumber(inputs.year, 2026);
    const detSize = getNumber(inputs.detSize, 50);
    const cgpa = getNumber(inputs.cgpa, 0);
    const pfa = getNumber(inputs.pfa, 0);
    const afoqt = getNumber(inputs.afoqt, 0);
    const nationalRate = getNumber(inputs.nationalRate, 70);

    const commanderRanking = inputs.commanderRanking
      ? inputs.commanderRanking.value
      : "middle";

    const majorType = inputs.majorType ? inputs.majorType.value : "nontech";

    const classSize = Math.max(1, Math.round(detSize));

    const gpaScore = clamp((cgpa / 4.0) * 100, 0, 100);
    const pfaScore = clamp(pfa, 0, 100);
    const afoqtScore = clamp((afoqt / 99) * 100, 0, 100);

    const rssData = calculateRssFromEstimatedRank(
      commanderRanking,
      classSize
    );

    const commanderScore = rssData.rssScore;
    const estimatedRank = rssData.estimatedRank;

    const orderOfMeritScore =
      gpaScore * weights.gpa +
      pfaScore * weights.pfa +
      afoqtScore * weights.afoqt +
      commanderScore * weights.commanderRanking;

    const baselineRate = clamp(nationalRate / 100, 0.01, 0.99);
    const slope = 0.08;
    const centeredScore = orderOfMeritScore - 70;

    let probability = clamp(
      sigmoid(logit(baselineRate) + slope * centeredScore),
      0.01,
      0.99
    );

    const orderOfMeritRounded = orderOfMeritScore.toFixed(1);
    const chanceRounded = (probability * 100).toFixed(1);
    const eaLikelihood = getEaLikelihoodLabel(Number(chanceRounded));

    results.wrapper.style.display = "block";
    results.omsResult.textContent = orderOfMeritRounded;
    results.chanceResult.textContent = chanceRounded + "%";

    results.omsBar.style.width = orderOfMeritRounded + "%";
    results.chanceBar.style.width = chanceRounded + "%";

    results.breakdown.innerHTML = `
      <strong>Breakdown for ${year}</strong><br><br>

      GPA Score: ${gpaScore.toFixed(1)} x ${weights.gpa * 100}% = ${(gpaScore * weights.gpa).toFixed(1)}<br>
      PFA Score: ${pfaScore.toFixed(1)} x ${weights.pfa * 100}% = ${(pfaScore * weights.pfa).toFixed(1)}<br>
      AFOQT Score: ${afoqtScore.toFixed(1)} x ${weights.afoqt * 100}% = ${(afoqtScore * weights.afoqt).toFixed(1)}<br>

      Commander's Ranking: ${commanderRankingLabels[commanderRanking]}<br>
      Estimated DCR Rank Used: ${estimatedRank} of ${classSize}<br>
      RSS Score: ${commanderScore.toFixed(1)} x 40% = ${(commanderScore * weights.commanderRanking).toFixed(1)}<br><br>

      Major Type: ${majorTypeLabels[majorType]}<br><br>

      Order of Merit Score: ${orderOfMeritRounded}<br>
      National Selection Rate Used: ${nationalRate}%<br>
      Estimated EA Selection Chance: ${chanceRounded}%<br><br>

      <strong>EA Likelihood Rating: ${eaLikelihood.rating}</strong><br>
      ${eaLikelihood.label}
    `;
  }

  if (calculateBtn) {
    calculateBtn.addEventListener("click", calculate);
  }
});
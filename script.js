document.addEventListener("DOMContentLoaded", function () {
  const CSV_PATH = "data/pocselection.csv";

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
    unknown: "Unknown Major Type",
  };

  let pocSelectionData = [];
  let csvLoadStatus = "loading";

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

  function parseCsvLine(line) {
    const values = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  function parseCsv(csvText) {
    const lines = csvText
      .trim()
      .split(/\r?\n/)
      .filter(function (line) {
        return line.trim() !== "";
      });

    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]);

    return lines.slice(1).map(function (line) {
      const values = parseCsvLine(line);
      const row = {};

      headers.forEach(function (header, index) {
        row[header] = values[index] || "";
      });

      return row;
    });
  }

  async function loadPocSelectionData() {
    try {
      const response = await fetch(CSV_PATH);

      if (!response.ok) {
        throw new Error("CSV file could not be loaded");
      }

      const csvText = await response.text();
      pocSelectionData = parseCsv(csvText);
      csvLoadStatus = "loaded";
    } catch (error) {
      console.warn("Could not load POC selection CSV:", error);
      pocSelectionData = [];
      csvLoadStatus = "failed";
    }
  }

  const csvLoadPromise = loadPocSelectionData();

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

  function tierDistance(tierA, tierB) {
    const tierValues = {
      top: 1,
      middle: 2,
      bottom: 3,
    };

    if (!tierValues[tierA] || !tierValues[tierB]) return 1;
    return Math.abs(tierValues[tierA] - tierValues[tierB]);
  }

  function getSurveyEstimate(candidate) {
    const rows = pocSelectionData.filter(function (row) {
      return (
        (row.ea_received === "0" || row.ea_received === "1") &&
        row.gpa !== "" &&
        row.pfa !== "" &&
        row.afoqt_aa !== "" &&
        row.commander_tier !== ""
      );
    });

    if (rows.length === 0) {
      return null;
    }

    const scoredRows = rows.map(function (row) {
      const rowGpa = Number(row.gpa);
      const rowPfa = Number(row.pfa);
      const rowAfoqt = Number(row.afoqt_aa);
      const rowTier = row.commander_tier;
      const rowMajor = row.major_type || "unknown";

      const gpaDiff = Math.abs(candidate.cgpa - rowGpa) / 4.0;
      const pfaDiff = Math.abs(candidate.pfa - rowPfa) / 100;
      const afoqtDiff = Math.abs(candidate.afoqt - rowAfoqt) / 99;
      const commanderDiff = tierDistance(candidate.commanderRanking, rowTier) / 2;

      let majorDiff = 0;

      if (rowMajor === "unknown" || candidate.majorType === "unknown") {
        majorDiff = 0.5;
      } else if (rowMajor !== candidate.majorType) {
        majorDiff = 1;
      }

      const distance =
        gpaDiff * 0.30 +
        pfaDiff * 0.20 +
        afoqtDiff * 0.25 +
        commanderDiff * 0.20 +
        majorDiff * 0.05;

      const similarityWeight = Math.exp(-8 * distance);

      return {
        eaReceived: Number(row.ea_received),
        distance,
        similarityWeight,
      };
    });

    scoredRows.sort(function (a, b) {
      return a.distance - b.distance;
    });

    const nearestRows = scoredRows.slice(0, 15);

    const totalWeight = nearestRows.reduce(function (sum, row) {
      return sum + row.similarityWeight;
    }, 0);

    if (nearestRows.length < 5 || totalWeight === 0) {
      return null;
    }

    const weightedEaRate =
      nearestRows.reduce(function (sum, row) {
        return sum + row.eaReceived * row.similarityWeight;
      }, 0) / totalWeight;

    const overallEaRate =
      rows.reduce(function (sum, row) {
        return sum + Number(row.ea_received);
      }, 0) / rows.length;

    const selectedCount = nearestRows.reduce(function (sum, row) {
      return sum + row.eaReceived;
    }, 0);

    let blendWeight = 0.25;

    if (nearestRows.length >= 10) {
      blendWeight = 0.35;
    }

    if (nearestRows.length >= 15) {
      blendWeight = 0.40;
    }

    return {
      surveyProbability: clamp(weightedEaRate, 0.01, 0.99),
      overallEaRate: clamp(overallEaRate, 0.01, 0.99),
      blendWeight,
      recordsUsed: nearestRows.length,
      selectedCount,
      totalRecords: rows.length,
    };
  }

  async function calculate() {
    await csvLoadPromise;

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

    const formulaProbability = clamp(
      sigmoid(logit(baselineRate) + slope * centeredScore),
      0.01,
      0.99
    );

    const candidate = {
      year,
      cgpa,
      pfa,
      afoqt,
      commanderRanking,
      majorType,
    };

    const surveyEstimate = getSurveyEstimate(candidate);

    let finalProbability = formulaProbability;
    let surveyBreakdown = "";

    if (surveyEstimate) {
      finalProbability =
        formulaProbability * (1 - surveyEstimate.blendWeight) +
        surveyEstimate.surveyProbability * surveyEstimate.blendWeight;

      finalProbability = clamp(finalProbability, 0.01, 0.99);

      surveyBreakdown = `
        <br>
        <strong>Survey Data Adjustment</strong><br>
        Formula-Only Estimate: ${(formulaProbability * 100).toFixed(1)}%<br>
        Similar Survey Estimate: ${(surveyEstimate.surveyProbability * 100).toFixed(1)}%<br>
        Survey Records Used: ${surveyEstimate.recordsUsed} nearest records (${surveyEstimate.selectedCount} received an EA)<br>
        Total Survey Records Loaded: ${surveyEstimate.totalRecords}<br>
        Overall Survey EA Rate: ${(surveyEstimate.overallEaRate * 100).toFixed(1)}%<br>
        Survey Blend Weight: ${(surveyEstimate.blendWeight * 100).toFixed(0)}%<br>
      `;
    } else if (csvLoadStatus === "failed") {
      surveyBreakdown = `
        <br>
        <strong>Survey Data Adjustment</strong><br>
        CSV data could not be loaded. Using formula-only estimate.<br>
        Make sure <code>data/pocselection.csv</code> exists and the site is running through GitHub Pages or a local server.<br>
      `;
    } else {
      surveyBreakdown = `
        <br>
        <strong>$Survey Data Adjustment</strong><br>
        Not enough usable survey records were found. Using formula-only estimate.<br>
      `;
    }

    const orderOfMeritRounded = orderOfMeritScore.toFixed(1);
    const chanceRounded = (finalProbability * 100).toFixed(1);
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
      RSS Score: ${commanderScore.toFixed(1)} x ${weights.commanderRanking * 100}% = ${(commanderScore * weights.commanderRanking).toFixed(1)}<br><br>

      Major Type: ${majorTypeLabels[majorType]}<br><br>

      Order of Merit Score: ${orderOfMeritRounded}<br>
      National Selection Rate Used: ${nationalRate}%<br>
      Estimated EA Selection Chance: ${chanceRounded}%<br>
      ${surveyBreakdown}<br>

      <strong>EA Likelihood Rating: ${eaLikelihood.rating}</strong><br>
      ${eaLikelihood.label}<br><br>

      <em>This is an unofficial estimate. The 2026 data is self-reported and should be treated as a rough trend, not an official prediction.</em>
    `;
  }

  if (calculateBtn) {
    calculateBtn.addEventListener("click", calculate);
  }
});
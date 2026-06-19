# POCSelect.github.io
This is an unofficial class project that estimates the chance of receiving an EA for AFROTC POC selection.

## What it uses

The calculator uses:

- Selection year
- Class / detachment size
- cGPA
- PFA score
- AFOQT score
- Commander ranking: Top, Middle, or Bottom Third
- Major type: Tech or Non-Tech
- National selection rate
- Survey data from `data/pocselection.csv`

current data uses info from these following web pages 

https://www.reddit.com/r/AFROTC/comments/1rpgde5/for_those_who_just_got_eas_what_were_your_stats/ #current CSV information
please recognise people who report these stats are more likely to be selects over non-selects.



## Calculated stats and weights

The calculator creates an unofficial Order of Merit Score out of 100 points.

| Stat | Weight in OMS |
|---|---:|
| cGPA | 20% |
| PFA score | 10% |
| AFOQT score | 20% |
| Commander ranking / RSS | 50% | I decided to put both LLAB and RSS together due to contraversey 

math is due to https://www.reddit.com/r/AFROTC/comments/1qieydl/psp_om_calculator/

The total is:

```text
Order of Merit Score = GPA contribution + PFA contribution + AFOQT contribution + RSS contribution
```

Example breakdown:

```text
GPA Score: 85.0 / 100 (25% of OMS) = 21.3 points
PFA Score: 92.0 / 100 (15% of OMS) = 13.8 points
AFOQT Score: 70.7 / 100 (20% of OMS) = 14.1 points
RSS Score: 69.0 / 100 (40% of OMS) = 27.6 points

Order of Merit Score: 76.8 / 100
```

## Commander ranking / RSS

Because cadets usually only know whether they are in the Top, Middle, or Bottom Third, the calculator estimates a DCR rank from the selected tier.

| Commander ranking | Estimated rank position |
|---|---:|
| Top Third | Around 1/6 of class size |
| Middle Third | Around 1/2 of class size |
| Bottom Third | Around 5/6 of class size |

It then estimates RSS using:

```text
RSS = ((1 - R / C) + 0.5 / C) * 100
```

Where:

```text
R = estimated DCR rank
C = class size
```

## Survey data

If survey data is available, the calculator compares the user's inputs to similar past survey records and blends that with the formula estimate.

The CSV file should be placed here:

```text
data/pocselection.csv
```

## File setup

Your project folder should look like this:

```text
project-folder/
├── index.html
├── styles.css
├── script.js
└── data/
    └── pocselection.csv
```

## Running locally

Do not open `index.html` directly by double-clicking it. The CSV may not load that way.

Use VS Code Live Server instead:

1. Open the project folder in VS Code.
2. Install the Live Server extension.
3. Right-click `index.html`.
4. Click **Open with Live Server**.

## GitHub Pages

This project can be hosted with GitHub Pages because it only uses HTML, CSS, JavaScript, and CSV data.

## Disclaimer

This project is not official. It is not affiliated with AFROTC, the Air Force, the Space Force, or any detachment.

The results are only estimates based on an unofficial formula and self-reported survey data.
import { SITE, pageTitle, esc, head, header, footer, icon, modulePreload } from './templates.mjs';

const ref = (text, url) => ({ text, url });
const REFS = {
  sauroLewis: ref('Sauro, J., & Lewis, J. R. (2016). Quantifying the User Experience: Practical Statistics for User Research (2nd ed.). Morgan Kaufmann.'),
  nielsenLandauer: ref('Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. Proceedings of INTERCHI 1993, 206–213.', 'https://doi.org/10.1145/169059.169166'),
  cohen: ref('Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences (2nd ed.). Lawrence Erlbaum.'),
  welch: ref('Welch, B. L. (1947). The generalization of "Student\'s" problem when several different population variances are involved. Biometrika, 34(1–2), 28–35.', 'https://doi.org/10.1093/biomet/34.1-2.28'),
  campbell: ref('Campbell, I. (2007). Chi-squared and Fisher–Irwin tests of two-by-two tables with small sample recommendations. Statistics in Medicine, 26(19), 3661–3675.', 'https://doi.org/10.1002/sim.2832'),
  agrestiCoull: ref('Agresti, A., & Coull, B. A. (1998). Approximate is better than "exact" for interval estimation of binomial proportions. The American Statistician, 52(2), 119–126.', 'https://doi.org/10.1080/00031305.1998.10480550'),
  agrestiCaffo: ref('Agresti, A., & Caffo, B. (2000). Simple and effective confidence intervals for proportions and differences of proportions result from adding two successes and two failures. The American Statistician, 54(4), 280–288.', 'https://doi.org/10.1080/00031305.2000.10474560'),
  lewisSauro2006: ref('Lewis, J. R., & Sauro, J. (2006). When 100% really isn\'t 100%: Improving the accuracy of small-sample estimates of completion rates. Journal of Usability Studies, 1(3), 136–150.'),
  sauroLewis2010: ref('Sauro, J., & Lewis, J. R. (2010). Average task times in usability tests: What to report? Proceedings of CHI 2010, 2347–2350.', 'https://doi.org/10.1145/1753326.1753679'),
  cronbach: ref('Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. Psychometrika, 16(3), 297–334.', 'https://doi.org/10.1007/BF02310555'),
  georgeMallery: ref('George, D., & Mallery, P. (2003). SPSS for Windows Step by Step: A Simple Guide and Reference (4th ed.). Allyn & Bacon.'),
};

const conf = (name = 'confidence') => `<label class="field"><span>Confidence level</span><select name="${name}"><option value="0.9">90%</option><option value="0.95" selected>95%</option><option value="0.99">99%</option></select></label>`;
const num = (name, label, value, { step = 'any', min = '', hint = '', suffix = '' } = {}) =>
  `<label class="field"><span>${label}</span><span class="input-wrap"><input type="number" inputmode="decimal" name="${name}" value="${value}" step="${step}"${min !== '' ? ` min="${min}"` : ''}>${suffix ? `<em>${suffix}</em>` : ''}</span>${hint ? `<small>${hint}</small>` : ''}</label>`;
const area = (name, label, placeholder, value = '', hint = '') =>
  `<label class="field field-wide"><span>${label}</span><textarea name="${name}" rows="5" spellcheck="false" placeholder="${esc(placeholder)}">${esc(value)}</textarea>${hint ? `<small>${hint}</small>` : ''}</label>`;
const modes = list => `<div class="mode-switch" role="radiogroup" aria-label="What do you want to calculate?">${list.map(([v, l], i) => `<label><input type="radio" name="mode" value="${v}"${i ? '' : ' checked'}><span>${l}</span></label>`).join('')}</div>`;

export const TOOLS = [
  {
    id: 'sample-size',
    description: 'How many participants you need for a UX study: estimate a score, compare two designs or find usability problems. Free sample size calculator with an APA write-up.',
    abbr: 'n',
    name: 'Sample size calculator',
    title: 'Sample Size Calculator for UX Research and Usability Testing',
    h1: 'Sample size calculator for UX research',
    lede: 'Work out how many participants you need to estimate a score precisely, to detect a difference between two designs, or to find most usability problems.',
    summary: 'How many participants you need for a precise score, an A/B comparison or problem discovery.',
    terms: ['UX sample size calculator', 'how many users for usability testing', 'sample size for SUS', 'usability test sample size'],
    form: `${modes([['estimate', 'Estimate a score'], ['compare', 'Compare two designs'], ['discover', 'Find problems']])}
      <div class="tool-fields" data-mode-fields="estimate">
        ${num('sd', 'Standard deviation', 17.5, { min: 0, hint: 'From earlier data, or about 17–18 points for SUS.' })}
        ${num('margin', 'Margin of error (±)', 5, { min: 0, hint: 'How close the estimate should be, in the same units.' })}
        ${conf()}
      </div>
      <div class="tool-fields" data-mode-fields="compare" hidden>
        ${num('sd2', 'Standard deviation', 17.5, { min: 0, hint: 'About 17–18 points for SUS.' })}
        ${num('diff', 'Smallest difference worth detecting', 10, { min: 0 })}
        ${conf('confidence2')}
        <label class="field"><span>Power</span><select name="power"><option value="0.8" selected>80%</option><option value="0.9">90%</option></select></label>
        <label class="field"><span>Study design</span><select name="design"><option value="between">Separate groups</option><option value="within">Same people</option></select></label>
      </div>
      <div class="tool-fields" data-mode-fields="discover" hidden>
        ${num('p', 'How often the problem occurs', 31, { min: 1, suffix: '%', hint: '31% is the average reported by Nielsen and Landauer (1993).' })}
        ${num('goal', 'Chance of seeing it at least once', 85, { min: 1, suffix: '%' })}
      </div>`,
    method: [
      'Estimating a score: n = (t × SD ÷ margin)², recalculated until n settles, because the t value depends on n.',
      'Comparing two designs: n = k × ((t for confidence + t for power) × SD ÷ difference)², with k = 2 for different people per group and k = 1 for the same people (within-subjects). Again iterated on t.',
      'Finding problems: the chance of seeing a problem at least once with n users is 1 − (1 − p)ⁿ, so n = ln(1 − goal) ÷ ln(1 − p).',
    ],
    refs: [REFS.sauroLewis, REFS.nielsenLandauer, REFS.cohen],
    faq: [
      ['How many users do I need for a usability test?', 'It depends on the goal. To find problems that affect about a third of users, five users give roughly an 85% chance of seeing each one, which is where the famous "five users" figure comes from. Problems that affect fewer people need more users. To report a score such as SUS with a margin of ±5 points at 95% confidence you need around 50 people, and comparing two designs usually needs more.'],
      ['How many participants do I need for a SUS study?', 'With the typical SUS standard deviation of about 17–18 points, roughly 50 participants give a 95% confidence interval of ±5 points, and about 15 give ±10 points. Use the "Estimate a score" mode above with your own margin.'],
      ['What standard deviation should I use?', 'The best source is your own earlier data on the same measure. Without that, published values are a reasonable starting point: SUS scores usually have a standard deviation of about 17–18 points. A larger standard deviation always means you need more participants.'],
      ['What is statistical power?', 'Power is the chance that a study detects a real difference of the size you specified. 80% is the usual convention (Cohen, 1988), so one study in five would miss a true effect of exactly that size. Raising power to 90% needs about a third more participants.'],
    ],
  },
  {
    id: 'ab-test',
    description: 'Compare SUS or other UX scores from two designs with Welch’s or a paired t-test, or compare completion rates. Get the p-value, confidence interval and effect size.',
    abbr: 'A/B',
    name: 'A/B test calculator',
    title: 'A/B Test Calculator for UX Scores – t-test and Completion Rates',
    h1: 'A/B test calculator for UX metrics',
    lede: 'Compare two designs, versions or products. Paste the scores for each, and get the difference, its confidence interval, a p-value and the effect size.',
    summary: 'Compare two designs with a t-test or a two-proportion test, with confidence intervals and effect size.',
    terms: ['A/B test calculator', 'compare SUS scores', 't-test calculator UX', 'compare completion rates'],
    form: `${modes([['independent', 'Different people'], ['paired', 'Same people'], ['rates', 'Completion rates']])}
      <div class="tool-fields" data-mode-fields="independent paired">
        ${area('a', 'Design A scores', 'e.g. 72.5, 80, 65, 90 …', '72.5 80 65 90 77.5 85 70 62.5', 'One value per participant, separated by commas, spaces or new lines.')}
        ${area('b', 'Design B scores', 'e.g. 60, 55, 72.5 …', '60 67.5 55 72.5 70 57.5 65 62.5')}
        ${conf()}
      </div>
      <div class="tool-fields" data-mode-fields="rates" hidden>
        ${num('x1', 'Design A: successes', 9, { min: 0, step: 1 })}
        ${num('n1', 'Design A: attempts', 10, { min: 1, step: 1 })}
        ${num('x2', 'Design B: successes', 5, { min: 0, step: 1 })}
        ${num('n2', 'Design B: attempts', 10, { min: 1, step: 1 })}
        ${conf('confidence2')}
      </div>`,
    method: [
      'Different people in each group: Welch’s t-test, which does not assume equal variances. The confidence interval is for the difference between the two means.',
      'Same people trying both designs: a paired t-test on each participant’s difference. Values must be in the same participant order in both lists.',
      'Completion rates: the N − 1 two-proportion test, which Sauro and Lewis recommend for small samples, with an adjusted-Wald interval for the difference.',
      'Effect size is Cohen’s d: about 0.2 is small, 0.5 medium and 0.8 large (Cohen, 1988). For paired data it is the mean difference divided by the SD of the differences (d_z).',
    ],
    refs: [REFS.sauroLewis, REFS.welch, REFS.campbell, REFS.agrestiCaffo, REFS.cohen],
    faq: [
      ['How do I compare two SUS scores?', 'Paste the individual SUS scores for each design into the two boxes. If different people used each design, choose "Different people" (Welch’s t-test). If the same people tried both, choose "Same people" (paired t-test). The result shows whether the difference is statistically significant and how big it is likely to be.'],
      ['What does the p-value mean?', 'The p-value is the probability of seeing a difference at least this large if the two designs were really the same. Below 0.05 is the usual threshold for calling a difference statistically significant, but the confidence interval is more informative because it shows how big the difference plausibly is.'],
      ['Can I compare completion rates with this?', 'Yes. Choose "Completion rates" and enter the number of successes and attempts for each design. It uses the N − 1 two-proportion test, which works well even with small samples.'],
      ['Which test should I use for within-subjects data?', 'If each participant used both designs, use the paired option. It is more sensitive because it removes differences between people, so it often finds effects that an independent-groups test would miss.'],
    ],
  },
  {
    id: 'completion-rate',
    description: 'Task completion rate calculator with an adjusted-Wald confidence interval for small samples, the best point estimate and a benchmark comparison. Free and private.',
    abbr: '%',
    name: 'Completion rate calculator',
    title: 'Completion Rate Calculator – Adjusted Wald Confidence Interval',
    h1: 'Task completion rate calculator',
    lede: 'Enter how many participants completed a task. Get the best estimate of the true completion rate, an adjusted-Wald confidence interval that works with small samples, and a comparison with a benchmark.',
    summary: 'Adjusted-Wald confidence interval and best estimate for small-sample task success rates.',
    terms: ['completion rate calculator', 'task success rate confidence interval', 'adjusted Wald calculator', 'usability completion rate'],
    form: `<div class="tool-fields">
        ${num('x', 'Participants who completed the task', 8, { min: 0, step: 1 })}
        ${num('n', 'Participants who attempted it', 10, { min: 1, step: 1 })}
        ${num('bench', 'Benchmark to compare with', 78, { min: 0, suffix: '%', hint: 'Sauro and Lewis report an average task completion rate of about 78%.' })}
        ${conf()}
      </div>`,
    method: [
      'The confidence interval is the adjusted-Wald interval: add z²/2 successes and z²/2 failures, then use the usual Wald formula. It keeps close to the stated confidence even with very small samples (Agresti & Coull, 1998).',
      'The best point estimate follows Lewis and Sauro (2006): the Wilson estimate when the observed rate is 50% or less, the Laplace estimate ((x + 1) ÷ (n + 2)) when it is 90% or more, and the observed rate in between.',
      'The benchmark comparison checks whether the whole interval lies above or below the benchmark.',
    ],
    refs: [REFS.agrestiCoull, REFS.lewisSauro2006, REFS.sauroLewis],
    faq: [
      ['How do I calculate a task completion rate?', 'Divide the number of participants who completed the task by the number who attempted it. With small samples that raw percentage is only a rough guide, so report it with a confidence interval like the one calculated above.'],
      ['Why not just report 100% if everyone succeeded?', 'With a small sample, 10 out of 10 does not mean every future user will succeed. The adjusted-Wald interval for 10/10 runs from about 68% to 100%, and the Laplace best estimate is about 92%, which is a more honest summary.'],
      ['What is a good task completion rate?', 'Across many usability studies the average completion rate is about 78%. Rates well below that usually point to a serious problem with the task, although critical tasks such as checkout or sign-up should be held to a higher standard.'],
    ],
  },
  {
    id: 'time-on-task',
    description: 'Time on task calculator: geometric mean with a confidence interval, median and descriptive statistics for skewed usability task times. Free and in your browser.',
    abbr: 'sec',
    name: 'Time on task calculator',
    title: 'Time on Task Calculator – Geometric Mean and Confidence Interval',
    h1: 'Time on task calculator',
    lede: 'Paste task times in seconds or minutes:seconds. Get the geometric mean with a confidence interval, the median and the usual descriptive statistics, as recommended for skewed task-time data.',
    summary: 'Geometric mean, confidence interval and median for skewed task times.',
    terms: ['time on task calculator', 'geometric mean task time', 'average task time usability', 'task time confidence interval'],
    form: `<div class="tool-fields">
        ${area('times', 'Task times', 'e.g. 94, 1:35, 2:10 …', '94 95 96 113 121 132 190 193 255 298', 'Seconds (94) or minutes:seconds (1:34), separated by commas, spaces or new lines.')}
        ${conf()}
      </div>`,
    method: [
      'Task times are positively skewed: a few slow participants pull the arithmetic mean up. Taking logs makes the data roughly symmetric.',
      'The geometric mean is the exponent of the mean of the log times. The confidence interval is calculated on the log scale with the t distribution and transformed back, so it is not symmetric.',
      'Sauro and Lewis (2010) found the geometric mean to be the best estimate of the median task time for samples under about 25. For larger samples the median works well.',
    ],
    refs: [REFS.sauroLewis2010, REFS.sauroLewis],
    faq: [
      ['Should I report the mean or the median task time?', 'For usability tests with fewer than about 25 participants, report the geometric mean. It estimates the population median better than either the sample median or the arithmetic mean (Sauro & Lewis, 2010). With larger samples the median is fine.'],
      ['How do I calculate a geometric mean?', 'Take the natural log of each time, average the logs, then raise e to that average. This calculator does it for you and also gives a confidence interval.'],
      ['Should I include failed tasks?', 'It depends on your question. Times for successful attempts only describe how long the task takes when it works. Including failures mixes in time spent struggling or giving up. Whichever you choose, say so in your report.'],
    ],
  },
  {
    id: 'cronbach-alpha',
    description: 'Free Cronbach’s alpha calculator. Paste questionnaire responses to get alpha, corrected item–total correlations and alpha if item deleted. Reversed items handled.',
    abbr: 'α',
    name: 'Cronbach’s alpha calculator',
    title: 'Cronbach’s Alpha Calculator – Online Reliability Analysis',
    h1: 'Cronbach’s alpha calculator',
    lede: 'Paste item responses to check the internal consistency of a questionnaire. Get Cronbach’s alpha, corrected item–total correlations and alpha if each item is deleted.',
    summary: 'Internal consistency for questionnaire data, with item–total correlations and alpha if deleted.',
    terms: ['Cronbach alpha calculator', 'reliability calculator online', 'internal consistency calculator', 'Cronbach’s alpha questionnaire'],
    form: `<div class="tool-fields">
        <label class="field"><span>Questionnaire</span><select name="preset" data-alpha-preset><option value="">Other / custom</option></select><small>Choosing one fills in the reverse-scored items and response range.</small></label>
        <label class="field"><span>Reverse-scored items</span><input type="text" name="reverse" value="2, 4" placeholder="e.g. 2, 4, 6" autocomplete="off"><small>Column numbers, counted after any ID column.</small></label>
        ${num('min', 'Lowest response', 1, { step: 1 })}
        ${num('max', 'Highest response', 5, { step: 1 })}
        ${area('data', 'Responses', 'One row per respondent, one column per item. A header row and an ID column are fine.', 'id,Q1,Q2,Q3,Q4,Q5\nP1,4,2,4,1,5\nP2,5,1,4,2,4\nP3,3,3,3,3,3\nP4,4,2,5,2,4\nP5,2,4,2,4,2\nP6,5,1,5,1,5', 'Comma, semicolon or tab separated, so you can paste straight from Excel or SPSS. Empty cells or NA drop that row.')}
      </div>`,
    method: [
      'α = k ÷ (k − 1) × (1 − Σ item variances ÷ variance of the total score), where k is the number of items (Cronbach, 1951).',
      'Reverse-scored items are flipped first (lowest + highest − response), otherwise they pull alpha down.',
      'The corrected item–total correlation compares each item with the sum of the other items. Values below about 0.3 suggest an item does not fit well.',
      'Bands follow George and Mallery’s (2003) rule of thumb: .9 excellent, .8 good, .7 acceptable, .6 questionable, .5 poor. Alpha also rises with the number of items, so treat the bands as a guide.',
    ],
    refs: [REFS.cronbach, REFS.georgeMallery],
    faq: [
      ['What is a good Cronbach’s alpha?', 'An alpha of .70 or above is usually treated as acceptable for research, .80 as good and .90 as excellent. Very high values (above .95) can mean some items are almost duplicates of each other.'],
      ['Do I need to reverse items before calculating alpha?', 'Yes. Negatively worded items, such as the even items of the SUS, must be reversed first, or alpha will be badly underestimated. Pick the questionnaire from the list above and this is done for you.'],
      ['Should I calculate alpha for each subscale?', 'Yes, if the questionnaire has subscales (for example UEQ or PSSUQ), report alpha for each subscale separately. A single alpha across several different constructs is hard to interpret.'],
      ['How do I report Cronbach’s alpha in APA style?', 'For example: "Internal consistency was good (Cronbach’s α = .85)." APA style drops the leading zero for statistics that cannot exceed 1. The write-up box above gives a sentence you can copy.'],
    ],
  },
];

// The combiner is not a statistics calculator, so it has its own top-level page.
export const COMBINE = {
  id: 'combine',
  path: '/combine/',
  section: 'combine',
  abbr: 'Σ',
  name: 'Combine result files',
  title: 'Combine SUS and UX Questionnaire Results into One Dataset',
  h1: 'Combine questionnaire results',
  lede: 'Drop in every participant’s download to get each person’s score, the group average and one clean dataset for SUS, UEQ, NASA-TLX or any other questionnaire here.',
  summary: 'Merge single-person result files into per-person scores, group averages and one dataset per questionnaire.',
  terms: ['combine SUS results', 'merge questionnaire results', 'aggregate SUS scores', 'questionnaire results to CSV', 'batch score questionnaires'],
  description: 'Merge participants’ SUS, UEQ or NASA-TLX result files (PDF, JSON, CSV, TXT or ZIP) into per-person scores, group averages and one dataset. Free and private.',
  preload: ['util', 'combine'],
  steps: [
    ['Send the link', 'Share a questionnaire page and give each person an ID.'],
    ['Collect the files', 'They download their result and send it to you.'],
    ['Drop them here', 'Select all files at once, or a whole folder.'],
  ],
  form: `<label class="dropzone combine-drop" data-dropzone>
      <input type="file" multiple accept=".json,.csv,.txt,.pdf,.zip,application/json,text/csv,text/plain,application/pdf,application/zip" data-files>
      ${icon.upload}<span><strong>Drop result files or ZIPs here</strong> or click to choose them</span>
      <small>PDF, JSON, CSV or TXT. Read on your device, nothing is uploaded.</small>
    </label>
    <p class="combine-folder muted">Files all in one folder? <label class="link-like">Choose the folder<input type="file" webkitdirectory multiple data-folder></label> instead.</p>`,
  method: [
    'Each file is matched to its questionnaire from the details saved in it. JSON, CSV and TXT downloads are read directly. PDFs carry the raw answers inside the file; PDFs from older versions of the site only hold the printed report and are listed as skipped.',
    'Every person is scored with the same code as the questionnaire’s own calculator, including reverse-scored items and N/A answers.',
    'The same answers saved in several formats, such as the four files in one ZIP, are counted once. Two different results with the same participant label are both kept, the second marked “(2)”.',
    'Group results show the mean with a 95% confidence interval based on the t distribution (Sauro & Lewis, 2016). NPS groups show the Net Promoter Score instead.',
    'The dataset download uses the same layout as the calculators’ dataset templates, so it can be opened in Excel, SPSS or R, or uploaded again later.',
  ],
  refs: [REFS.sauroLewis],
  faq: [
    ['Which files can I upload?', 'Any result downloaded from a questionnaire page on this site: PDF, JSON, CSV, TXT, or the ZIP that holds all four. You can mix formats and questionnaires in one go. Files from other tools are skipped and listed so you can check them.'],
    ['How do I collect results from participants?', 'Send each participant the link to the questionnaire, for example the SUS calculator. Ask them to enter their participant ID, finish the questionnaire and send you the download. JSON or CSV are the safest formats to ask for.'],
    ['Why was a PDF skipped?', 'PDFs from older versions of the site only contain the printed report, not the answers in a form a computer can read. Ask for the JSON or CSV version of those results, or type the answers into the dataset template.'],
    ['What happens to people who filled in more than one questionnaire?', 'Each questionnaire gets its own group, and a by-participant table lines up their scores side by side. Scores are matched on the participant label, so ask people to use the same code every time.'],
    ['Are my participants’ files uploaded anywhere?', 'No. The files are opened by your browser and never leave your computer. Closing the tab clears everything.'],
  ],
};

export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.id, t]));

export function toolRow(t) {
  return `<a class="scale-row tool-row" href="/tools/${t.id}/">
  <span class="abbr">${esc(t.abbr)}</span>
  <div class="scale-row-main">
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.summary)}</p>
  </div>
  <div class="scale-row-meta"><span>Free, in your browser</span></div>
  <span class="scale-row-go">${icon.arrow}</span>
</a>`;
}

const faqHtml = faq => `<div class="faq-list">
        ${faq.map(([q, a]) => `<details class="faq-item"><summary><h3>${esc(q)}</h3><span class="faq-icon" aria-hidden="true"></span></summary><div class="faq-body"><p>${esc(a)}</p></div></details>`).join('\n        ')}
      </div>`;

export function renderTool(tool) {
  const path = tool.path ?? `/tools/${tool.id}/`;
  const isStats = !tool.path;
  const title = pageTitle(tool.title);
  const description = tool.description ?? `${tool.lede.split('. ')[0]}. Free, private and calculated in your browser.`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${SITE.url}${path}#webpage`, url: SITE.url + path, name: title, description, inLanguage: 'en',
        isPartOf: { '@id': `${SITE.url}/#website` }, breadcrumb: { '@id': `${SITE.url}${path}#breadcrumbs` },
        citation: tool.refs.map(r => ({ '@type': 'CreativeWork', name: r.text, ...(r.url ? { url: r.url } : {}) })),
      },
      {
        '@type': 'WebApplication', '@id': `${SITE.url}${path}#app`, name: tool.name, alternateName: tool.terms, url: SITE.url + path,
        applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': `${SITE.url}/#org` },
      },
      { '@type': 'FAQPage', '@id': `${SITE.url}${path}#faq`, mainEntity: tool.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      { '@type': 'BreadcrumbList', '@id': `${SITE.url}${path}#breadcrumbs`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
        ...(isStats ? [{ '@type': 'ListItem', position: 2, name: 'Stats tools', item: `${SITE.url}/tools/` }] : []),
        { '@type': 'ListItem', position: isStats ? 3 : 2, name: tool.name, item: SITE.url + path },
      ] },
    ],
  };
  const others = TOOLS.filter(t => t.id !== tool.id);
  const crumbs = isStats ? '<a href="/">Home</a><span>/</span><a href="/tools/">Stats tools</a>' : '<a href="/">Home</a>';

  return `${head({ title, description, path, jsonld, imageAlt: `${tool.name} on ${SITE.name}`, scripts: modulePreload(tool.preload ?? ['util', 'tools-ui', 'research', 'stats']) })}
<body data-page="tool" data-tool="${tool.id}">
${header(tool.section ?? 'tools')}
<main id="main">
  <section class="scale-hero tool-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>
      <h1>${esc(tool.h1)}</h1>
      <p class="lede">${esc(tool.lede)}</p>
      <p class="intro-line">Free and private: everything runs in your browser and nothing you enter or upload is sent anywhere.</p>
    </div>
  </section>

  <div class="wrap scale-body">
    <div class="panel">
      ${tool.steps ? `<ol class="how-steps" aria-label="How it works">${tool.steps.map(([h, p]) => `<li><h2>${esc(h)}</h2><p>${esc(p)}</p></li>`).join('')}</ol>` : ''}
      ${isStats ? `<form class="card tool-form" data-tool-form novalidate>
        ${tool.form}
      </form>` : tool.form}
      <div class="tool-out" data-tool-out aria-live="polite"></div>

      <div class="method-grid tool-method">
        <div class="method-main">
          <h2>How it is calculated</h2>
          <ol class="steps">${tool.method.map(m => `<li>${esc(m)}</li>`).join('')}</ol>
        </div>
        <aside class="refs">
          <h2>References</h2>
          <ol>${tool.refs.map(r => `<li>${esc(r.text)}${r.url ? ` <a href="${r.url}" rel="noopener">${esc(r.url.replace('https://', ''))}</a>` : ''}</li>`).join('')}</ol>
        </aside>
      </div>
    </div>

    <section class="faq" id="faq">
      <h2 class="section-title small">Frequently asked questions</h2>
      ${faqHtml(tool.faq)}
    </section>

    <section class="related">
      <h2 class="section-title small">${isStats ? 'Other stats tools' : 'Next steps with your data'}</h2>
      ${isStats ? '' : '<p class="muted">Comparing two groups, or planning the next round? These take the scores from above.</p>'}
      <div class="scale-list">${others.map(toolRow).join('\n')}</div>
      <div class="cross-links">
        <a class="cross-link" href="/#scales"><strong>UX questionnaire calculators</strong><span>SUS, UEQ, NASA-TLX and 17 more, each with a dataset tab.</span></a>
        ${isStats ? '<a class="cross-link" href="/combine/"><strong>Combine result files</strong><span>One download per participant? Merge them into a dataset first.</span></a>' : '<a class="cross-link" href="/sus/#dataset"><strong>Score a SUS dataset</strong><span>Upload a spreadsheet with one row per person.</span></a>'}
      </div>
    </section>
  </div>
</main>
${footer()}
<div class="toast" data-toast role="status" aria-live="polite"></div>
<script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}

export function renderToolsHub() {
  const path = '/tools/';
  const title = pageTitle('UX Research Stats Calculators: Sample Size, A/B Test and More');
  const description = 'Free UX research calculators for sample size, A/B tests, task completion rates, time on task and Cronbach’s alpha, each with an APA-ready write-up.';
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${SITE.url}${path}#webpage`, url: SITE.url + path, name: title, description, isPartOf: { '@id': `${SITE.url}/#website` } },
      { '@type': 'ItemList', name: 'UX research calculators', numberOfItems: TOOLS.length, itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/tools/${t.id}/`, name: t.name })) },
    ],
  };
  return `${head({ title, description, path, jsonld, imageAlt: `UX research calculators on ${SITE.name}` })}
<body data-page="tools">
${header('tools')}
<main id="main">
  <section class="scale-hero tool-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a></nav>
      <h1>Stats tools for UX research</h1>
      <p class="lede">The statistics that come up in almost every usability study or thesis: how many participants to recruit, whether design B really beat design A, and how to report completion rates, task times and reliability properly.</p>
      <p class="intro-line">Each tool follows the methods in Sauro and Lewis’s <em>Quantifying the User Experience</em> and gives you a sentence you can paste into a report.</p>
    </div>
  </section>
  <div class="wrap scale-body">
    <h2 class="sr-only">All stats tools</h2>
    <div class="scale-list">${TOOLS.map(toolRow).join('\n')}</div>
    <div class="cross-links">
      <a class="cross-link" href="/#scales"><strong>Scoring a questionnaire?</strong><span>All 20 questionnaires, each with its own calculator and dataset tab.</span></a>
      <a class="cross-link" href="/combine/"><strong>Got one result file per participant?</strong><span>Combine them into per-person scores and one dataset.</span></a>
    </div>
  </div>
</main>
${footer()}
<script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}

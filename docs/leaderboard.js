"use strict";
const el = id => document.getElementById(id);
(async () => {
  try {
    async function read(url) {
      const response = await fetch(url, {cache: 'no-cache'});
      if (!response.ok) throw new Error('Unavailable');
      return response.json();
    }
    const config = await read('challenge.json');
    document.title = config.title; el('title').textContent = config.title;
    el('description').textContent = config.description;
    const fonts = {sans: 'Inter,ui-sans-serif,system-ui,sans-serif', serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,SFMono-Regular,Consolas,monospace'};
    document.documentElement.style.fontFamily = fonts[config.font_family] || fonts.sans;
    if (config.example_code?.trim()) {
      el('content-tabs').hidden = false;
      el('example-heading').textContent = config.example_title || 'Getting started';
      el('example-description').textContent = config.example_description || '';
      // Small display-only lexer. Every token uses textContent, never HTML insertion.
      const pattern = /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\b(?:import|from|as|def|class|return|if|elif|else|for|while|in|with|try|except|finally|raise|yield|lambda|pass|True|False|None|and|or|not|is|async|await)\b|\b\d+(?:\.\d+)?\b/g;
      let offset = 0;
      for (const match of config.example_code.matchAll(pattern)) {
        el('example-code').append(document.createTextNode(config.example_code.slice(offset, match.index)));
        const span = document.createElement('span'), token = match[0];
        span.className = token.startsWith('#') ? 'py-comment' : /^["']/.test(token) ? 'py-string' : /^\d/.test(token) ? 'py-number' : 'py-keyword';
        span.textContent = token; el('example-code').append(span); offset = match.index + token.length;
      }
      el('example-code').append(document.createTextNode(config.example_code.slice(offset)));
      function selectTab(examples, focus = false) {
        for (const [name, active] of [['overview', !examples], ['examples', examples]]) {
          el(name + '-tab').setAttribute('aria-selected', String(active));
          el(name + '-tab').tabIndex = active ? 0 : -1;
          el(name + '-panel').hidden = !active;
          if (active && focus) el(name + '-tab').focus();
        }
      }
      el('overview-tab').onclick = () => { selectTab(false); history.replaceState(null, '', '#overview'); };
      el('examples-tab').onclick = () => { selectTab(true); history.replaceState(null, '', '#examples'); };
      el('content-tabs').onkeydown = event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const examples = event.key === 'Home' ? false : event.key === 'End' ? true : el('examples-tab').getAttribute('aria-selected') !== 'true';
          selectTab(examples, true); history.replaceState(null, '', examples ? '#examples' : '#overview');
        }
      };
      window.addEventListener('hashchange', () => selectTab(location.hash === '#examples'));
      selectTab(location.hash === '#examples');
      el('copy-example').onclick = async () => {
        try { await navigator.clipboard.writeText(config.example_code); el('example-feedback').textContent = 'Code copied.'; }
        catch { el('example-feedback').textContent = 'Clipboard unavailable. Select the code or download example.py.'; }
      };
      el('download-example').onclick = () => {
        const url = URL.createObjectURL(new Blob([config.example_code], {type: 'text/x-python;charset=utf-8'}));
        const link = document.createElement('a'); link.href = url; link.download = 'example.py'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
    }
    el('organizer').textContent = config.organizer || 'galilai-group';
    if (/^#[0-9a-fA-F]{6}$/.test(config.accent_color || '')) {
      const color = config.accent_color;
      document.documentElement.style.setProperty('--accent', color);
      const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255)
        .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      document.documentElement.style.setProperty('--accent-text', rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#000' : '#fff');
    }
    for (const name of ['logo', 'banner']) {
      try {
        const image = new URL(config[name + '_url']);
        if (image.protocol === 'https:' && !image.username && !image.password) {
          el(name).onerror = () => { el(name).hidden = true; };
          el(name).src = image.href; el(name).hidden = false;
        }
      } catch { /* Optional branding. */ }
    }
    const dateText = value => new Date(value).toLocaleString(undefined, {timeZone: 'UTC', timeZoneName: 'short'});
    function schedule() {
      const now = Date.now(), opens = Date.parse(config.opens_at), closes = Date.parse(config.closes_at);
      const state = config.accepting_submissions === false ? 'Closed' : now < opens ? 'Opening soon' : now >= closes ? 'Closed' : 'Open for submissions';
      el('challenge-state').textContent = state;
      el('details').textContent = now < opens && config.accepting_submissions !== false ? `Opens ${dateText(config.opens_at)}` : Number.isFinite(closes) ? `Deadline: ${dateText(config.closes_at)}` : 'No submission deadline announced.';
      if (state === 'Open for submissions' && Number.isFinite(closes)) {
        const minutes = Math.max(0, Math.ceil((closes - now) / 60000));
        el('details').textContent += ` · ${Math.floor(minutes / 1440)}d ${Math.floor(minutes / 60) % 24}h ${minutes % 60}m remaining`;
      }
      const sourceOpen = config.training_mode && config.training_mode !== 'disabled' && config.training_accepting_submissions !== false && (!Number.isFinite(opens) || now >= opens) && (!config.source_closes_at || now < Date.parse(config.source_closes_at));
      el('submit').textContent = state === 'Open for submissions' ? 'Submit compiled model' : 'Submit training source';
      el('submit').hidden = (state !== 'Open for submissions' && !sourceOpen) || !el('submit').getAttribute('href');
    }
    try {
      const url = config.submit_url ? new URL(config.submit_url) : new URL('/submit', config.service_url);
      if (url.protocol === 'https:' || url.hostname === 'localhost') {
        url.searchParams.set('challenge', config.slug); el('submit').href = url.href;
      }
    } catch { /* Overview remains readable without a submission endpoint. */ }
    schedule(); setInterval(schedule, 1000);
    if (config.training_data_url) {
      const training = new URL(config.training_data_url);
      if (training.protocol === 'https:' && training.hostname === 'drive.google.com') {
        el('training-data').href = training.href; el('training-data').hidden = false;
      }
    }
    for (const [key, label] of [['opens_at', 'Submissions open'], ['closes_at', 'Submission deadline'], ['results_at', 'Results announcement']]) {
      if (!config[key]) continue;
      const item = document.createElement('li'), title = document.createElement('strong'), time = document.createElement('time');
      title.textContent = label; time.dateTime = config[key]; time.textContent = dateText(config[key]);
      item.append(title, time); el('timeline-dates').append(item); el('timeline').hidden = false;
    }
    for (const [key, label] of [['model_format', 'Compiled model format'], ['input_output_spec', 'Inputs & outputs'], ['evaluation_description', 'Evaluation'], ['allowed_training_data', 'Permitted training data']]) {
      if (!config[key]?.trim()) continue;
      const section = document.createElement('section'), title = document.createElement('h3'), text = document.createElement('p');
      title.textContent = label; text.textContent = config[key]; section.append(title, text); el('rule-sections').append(section);
    }
    el('submission-rules').textContent = `Latest accepted model per verified email. ${config.daily_limit ?? 5} upload attempts per UTC day; ${config.min_submission_interval_minutes || 0} minutes between new submissions.`
      + (config.max_bytes ? ` Maximum model size: ${(config.max_bytes / 1024 ** 2).toLocaleString()} MiB.` : '')
      + (config.allowed_email_domains?.length ? ` Eligible email domains: ${config.allowed_email_domains.join(', ')}.` : '')
      + ` Ranking: ${config.metric}, ${config.direction === 'minimize' ? 'lower' : 'higher'} is better.`;
    const trainingEnabled = config.training_mode && config.training_mode !== 'disabled';
    if (trainingEnabled) {
      el('training-section').hidden = false;
      el('download-environment').onclick = async () => {
        el('download-environment').disabled = true;
        try {
          const response = await fetch('environment.zip.base64', {cache: 'no-cache'});
          if (!response.ok) throw new Error('Unavailable');
          const bytes = Uint8Array.from(atob((await response.text()).trim()), char => char.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], {type: 'application/zip'}));
          const link = document.createElement('a'); link.href = url; link.download = 'training-environment.zip'; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          el('environment-status').textContent = '';
        } catch { el('environment-status').textContent = 'Download unavailable. Use the individual files below.'; }
        finally { el('download-environment').disabled = false; }
      };
      el('training-policy').textContent = (config.training_mode === 'required_finalists' ? 'Finalists must submit training source. ' : 'Training source submission is optional. ')
        + `Upload a ZIP with main.py at its root after submitting a compiled model. Maximum ZIP: ${(config.source_max_bytes || 25 * 1024 ** 2) / 1024 ** 2} MiB. `
        + (config.source_closes_at ? `Source deadline: ${dateText(config.source_closes_at)}. ` : '')
        + `Write the compiled model to /output/${config.training_output || 'model.pt'}. Verification runs when scheduled by the organizer.`;
    }
    const data = await read('leaderboard.json');
    el('updated').textContent = data.updated_at ? `Last published: ${dateText(data.updated_at)}` : 'Awaiting the first results publication.';
    const anonymous = (data.anonymous ?? config.anonymous) !== false;
    el('identity-policy').textContent = anonymous ? 'Participants use stable IDs; email addresses and compiled model files remain private.' : 'Participant email addresses are displayed publicly. Compiled model files remain private.';
    el('group-filter').replaceChildren(new Option('All participants', ''));
    for (const group of (data.groups || [])) el('group-filter').append(new Option(group, group));
    const primary = data.metric || config.metric;
    const metrics = [primary, ...new Set((data.metrics || data.rows.flatMap(r => Object.keys(r.metrics || {}))).filter(k => k !== primary))];
    el("columns").replaceChildren();
    let sortMetric = null, ascending = false;
    const headings = ['Rank', anonymous ? 'Participant ID' : 'Email', ...metrics, 'Submitted', 'Status', 'Logs', ...(trainingEnabled ? ['Source verification'] : [])];
    for (const [index, label] of headings.entries()) {
      const th = document.createElement('th'); th.scope = 'col';
      if (index >= 2 && index < metrics.length + 2) {
        const metric = metrics[index - 2], button = document.createElement('button');
        th.className = metric === primary ? 'primary-metric' : ''; th.setAttribute('aria-sort', 'none');
        button.type = 'button'; button.className = 'sort-button'; button.textContent = label + (metric === primary ? ' · Primary' : '');
        button.onclick = () => {
          ascending = sortMetric === metric ? !ascending : (metric === primary && (data.direction || config.direction) === 'minimize');
          sortMetric = metric;
          el('columns').querySelectorAll('[aria-sort]').forEach(h => h.setAttribute('aria-sort', 'none'));
          th.setAttribute('aria-sort', ascending ? 'ascending' : 'descending'); render();
        };
        th.append(button);
      } else th.textContent = label;
      el('columns').append(th);
    }
    el("policy").textContent = `Latest accepted compiled model per participant · Failed evaluations below ranked results · Minimum interval: ${config.min_submission_interval_minutes || 0} min · Ranks are global · Evaluation ${data.evaluator_version || config.evaluator_version || 'not configured'}`;
    el('close-logs').onclick = () => el('logs-dialog').close();
    function render() {
      el("rows").replaceChildren();
      const query = el('search').value.toLowerCase(), group = el('group-filter').value;
      const rows = data.rows.filter(row => (row.participant.toLowerCase().includes(query) || (row.participant_id || '').includes(query))
        && (!group || (row.groups || []).includes(group)));
      rows.sort((a, b) => {
        if ((a.status === 'failed') !== (b.status === 'failed')) return a.status === 'failed' ? 1 : -1;
        if (!sortMetric || a.status === 'failed') return (a.rank || Infinity) - (b.rank || Infinity);
        const score = r => r.metrics?.[sortMetric] ?? (sortMetric === primary ? r.score : null);
        const x = score(a), y = score(b);
        if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
        return (ascending ? x - y : y - x) || a.rank - b.rank;
      });
      for (const row of rows) {
        const failed = row.status === 'failed';
        const tr = document.createElement("tr"); if (failed) tr.className = 'failed';
        const values = [failed ? '—' : row.rank, row.participant,
          ...metrics.map(m => failed ? '—' : (row.metrics?.[m] ?? (m === primary ? row.score : null) ?? '—')),
          new Date(row.submitted_at).toLocaleString(), failed ? 'Failed' : 'Succeeded'];
        for (const [index, value] of values.entries()) {
          const td = document.createElement("td"); td.textContent = String(value); if (index === 2) td.className = "primary-metric"; if (index >= 2 && index < metrics.length + 2 && row.training?.status === 'succeeded') {
            const value = row.training.metrics?.[metrics[index - 2]];
            if (typeof value === 'number') {
              const verified = document.createElement('span'); verified.className = 'source-score';
              verified.textContent = `✓ ${value}`; verified.title = 'Evaluated from training source; original score above' + (row.training.execution_mode === 'unsafe' ? ' · Host run without isolation' : '');
              td.append(verified);
            }
          }
          tr.appendChild(td);
        }
        const logs = document.createElement('td');
        if (failed) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'log-button'; button.textContent = 'View logs';
          button.onclick = () => {
            el('log-submission').textContent = `Participant ${row.participant} · Submission ${row.submission_id || 'unavailable'}`;
            el('log-content').textContent = row.logs || 'No public diagnostics available. Contact the organizers.';
            el('logs-dialog').showModal();
          };
          logs.append(button);
        } else logs.textContent = '—';
        tr.append(logs);
        if (trainingEnabled) {
          const cell = document.createElement('td'), verification = row.training || {status: 'missing'};
          if (verification.status === 'failed') {
            const button = document.createElement('button'); button.className = 'source-failure'; button.textContent = '⚑ Failed — logs'; button.title = verification.execution_mode === 'unsafe' ? 'Host execution without isolation' : 'Source verification failed';
            button.onclick = () => {
              el('log-submission').textContent = `Source verification · Participant ${row.participant}`;
              el('log-content').textContent = verification.logs || 'Contact the organizer for diagnostics.';
              el('logs-dialog').showModal();
            }; cell.append(button);
          } else {
            const labels = {missing: 'No source uploaded', queued: 'Awaiting verification', running: 'Training', succeeded: '✓ Source evaluated', stale: 'Needs re-verification'};
            cell.textContent = (labels[verification.status] || 'Awaiting verification') + (verification.execution_mode === 'unsafe' ? ' · Unsafe runner' : '');
            if (verification.status === 'succeeded') cell.className = 'source-success';
          }
          tr.append(cell);
        }
        el("rows").appendChild(tr);
      }
      el("status").textContent = rows.length ? "" : (data.rows.length ? "No matching participants." : "No evaluated submissions yet.");
    }
    el("search").addEventListener("input", render); el("group-filter").addEventListener("change", render); render();
  } catch { el("status").textContent = "Scores are temporarily unavailable. Please reload shortly."; }
})();

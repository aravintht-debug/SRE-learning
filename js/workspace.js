/* SRE Learning · the learner's own Claude workspace, used by every "Do it in Claude" step.
   One claude.ai Project ("SRE Learning") + one local folder (~/sre-learning-workspace/week-NN) for Claude Code and Cowork.
   Loaded after the week files: adds the Week 1 setup step, a wrap-up step to every week, and two workspace checks
   to every guide step. app.js renders PL.WS.runSteps() above the prompts. */
(function () {
  'use strict';
  const PL = window.PL;

  const WS = (PL.WS = {
    project: 'SRE Learning',
    folder: '~/sre-learning-workspace',
    officeFolder: 'OneDrive › SRE Learning',
    SURFACES: ['claude.ai', 'Claude Code', 'Cowork', 'Claude for Excel', 'Claude for Word', 'Claude for PowerPoint'],
  });
  const pad = (n) => String(n).padStart(2, '0');
  WS.weekDir = (week) => 'week-' + pad(week);
  WS.chatName = (step) => step.id.toUpperCase() + ' · ' + step.title;
  WS.notesFile = (week) => WS.folder + '/' + WS.weekDir(week) + '/notes.md';

  /* Ordered "how to run this step in your workspace" instructions, one block per Claude surface the step uses. */
  WS.runSteps = function (step, week) {
    const dir = WS.weekDir(week), chat = WS.chatName(step);
    const seen = [];
    (step.prompts || []).forEach((p) => { const s = /^Claude for /.test(p.where) ? 'office' : p.where; if (!seen.includes(s)) seen.push(s); });
    const blocks = {
      'claude.ai': {
        title: 'In claude.ai: your SRE Learning Project',
        items: [
          'Open <b>claude.ai → Projects → ' + WS.project + '</b>. If it doesn\'t exist yet, do Week 1 › Step 0 first.',
          'Start a <b>new chat inside the Project</b> (not a plain chat), so it uses your Project instructions and knowledge.',
          'Rename the chat to <code>' + chat + '</code> so you can find it later.',
          'Run the claude.ai prompts below <b>in order, in that same chat</b>. Ask at least one follow-up in your own words.',
          'Keep the useful output as an <b>Artifact</b> ("make this an Artifact"). The chat and Artifact are your evidence.',
        ],
      },
      'Claude Code': {
        title: 'In Claude Code: your workspace folder',
        items: [
          'Open a terminal and go to this week\'s folder: <code>cd ' + WS.folder + '/' + dir + '</code>',
          'Start Claude Code with <code>claude</code>. It picks up the workspace <code>CLAUDE.md</code> rules.',
          'Paste the Claude Code prompts below in order. <b>Read every proposed edit or command before you approve it.</b>',
          'When the step works, commit it: <code>git add -A &amp;&amp; git commit -m "' + step.id.toUpperCase() + '"</code>',
        ],
      },
      Cowork: {
        title: 'In Cowork: point it at your workspace',
        items: [
          'Open the Claude desktop app and switch to <b>Cowork</b>.',
          'Give Cowork access to <code>' + WS.folder + '/' + dir + '</code> only, not your whole drive.',
          'Paste the Cowork prompt below, <b>review the plan it shows before it runs</b>, and watch what it does.',
          'Check the files it created are in <code>' + dir + '</code> and open each one.',
        ],
      },
      office: {
        title: 'In Microsoft 365: Claude for Excel / Word / PowerPoint',
        items: [
          'Create or copy the file into <b>' + WS.officeFolder + ' › Week ' + pad(week) + '</b>.',
          'Open it and start the <b>Claude add-in</b> from the ribbon.',
          'Run the prompts below in order and review every change Claude makes to the file.',
        ],
      },
    };
    return seen.map((s) => blocks[s]).filter(Boolean);
  };

  /* Note line the learner appends to week-NN/notes.md after every step. */
  WS.noteTemplate = (step) => '## ' + WS.chatName(step) + '\n- Where: ' + [...new Set((step.prompts || []).map((p) => p.where))].join(', ') +
    '\n- What I did:\n- What I verified (and against which doc):\n- What Claude got wrong or I had to fix:\n- Evidence: [chat name / Artifact link / commit hash]\n';

  const HELP = { label: 'Claude Help Center · Projects', url: 'https://support.claude.com/' };

  /* ---------- Week 1 · Step 0: set up the workspace ---------- */
  const setupStep = {
    id: 'w01-t1-s0', kind: 'guide', workspace: 'setup', title: 'Set up your SRE Learning workspace in Claude', minutes: 25, source: HELP,
    scenario: 'Every "Do it in Claude" step in the 20 weeks runs in the same place: a claude.ai Project called <b>SRE Learning</b> and a local folder <code>' + WS.folder + '</code>. Set both up once now, so each step builds on the last and you can see everything you did.',
    task: [
      'In claude.ai, open <b>Projects → Create project</b>, name it <b>' + WS.project + '</b>, and paste prompt 1 into the Project instructions.',
      'Fill in prompt 2, save it as <code>my-environment.md</code>, and add it to the Project knowledge. Leave out secrets, hostnames and customer names.',
      'In a terminal, run the commands in block 3, then paste prompt 4 into Claude Code so it builds the workspace folder for you.',
      'Start a new chat inside the Project and run prompt 5 to confirm Claude has picked up your instructions.',
    ],
    prompts: [
      { label: 'Project instructions', where: 'claude.ai', note: 'Paste into <b>Project → Instructions</b>, not into a chat.', text: 'I am a DevOps / SRE engineer at SwiftAnt, working through a 20-week SRE programme (Claude, Azure AZ-104, Terraform, Kubernetes, observability, incident response, agents). Every chat in this Project is one hands-on step; the chat name starts with the step ID, e.g. W07-T2-S1.\n\nHow to help me:\n- Work with me on the task; explain what you are doing and why, so I learn it, not just get the answer.\n- Use sandbox / non-production examples only. Mark any destructive or irreversible command with ⚠ and give the safe check to run first.\n- Name the official doc page I should verify each command or fact against.\n- Never ask me for secrets, keys or customer data. If I paste something that looks like one, tell me.\n- End each answer with: "Save to notes:" and one line I can copy into my week notes.' },
      { label: 'Knowledge file: my-environment.md', where: 'claude.ai', note: 'Fill the brackets, save as a file, then add it under <b>Project → Files</b>.', text: '# My environment (no secrets)\n- Role: [DevOps / SRE / Cloud engineer]\n- Clouds and services I use: [Azure: AKS, App Service, VNets, Key Vault, …]\n- IaC and CI/CD: [Terraform / Bicep, GitHub Actions / Azure DevOps]\n- Observability: [Azure Monitor, Grafana, Elastic, Wazuh, …]\n- Naming standard: [e.g. rg-<app>-<env>-<region>]\n- Environments: [dev / test / prod] · Sandbox subscription for labs: [yes/no]\n- Things I want to get better at: [3 items]' },
      { label: 'Create the workspace folder', where: 'Claude Code', lang: 'bash', note: 'Works in Git Bash, macOS and Linux. In PowerShell use <code>mkdir $HOME\\sre-learning-workspace; cd $HOME\\sre-learning-workspace; claude</code>.', text: 'mkdir -p ~/sre-learning-workspace\ncd ~/sre-learning-workspace\nclaude' },
      { label: 'Let Claude Code build the workspace', where: 'Claude Code', text: 'Set this folder up as my SRE Learning workspace for a 20-week programme:\n1. Create folders week-01 … week-20, each with a notes.md that starts with "# Week NN notes".\n2. Create a README.md explaining the layout: one folder per week, one notes.md entry per step, step IDs like W07-T2-S1.\n3. Create a .gitignore that excludes *.tfstate*, .terraform/, .env*, *.pem, *.pfx, *.key, kubeconfig and secrets/.\n4. Create a CLAUDE.md with these rules: this is a learning workspace; sandbox resources only; explain each command before running it; never run anything against production; never write secrets to files; after each step, append an entry to the current week\'s notes.md.\n5. git init and make a first commit "Workspace setup".\nShow me the plan before you create anything.' },
      { label: 'Check the Project is working', where: 'claude.ai', note: 'Start a new chat <b>inside the SRE Learning Project</b> and name it <code>W01-T1-S0 · Setup check</code>.', text: 'What do you know about me, my environment and how I want you to help in this Project? Then list the rules you will follow for every step.' },
    ],
    expected: ['A Project called SRE Learning with your instructions and my-environment.md in its knowledge', 'A git repo at ' + WS.folder + ' with week-01 … week-20, README.md, .gitignore, CLAUDE.md and one commit', 'Claude\'s setup-check answer repeats your role, environment and the safety rules'],
    verify: 'Open CLAUDE.md and .gitignore yourself and check they say what you asked. Run git log to confirm the commit exists.',
    atWork: 'This is the same pattern you will use for a real platform: a Project that holds the team\'s context, and a repo with a CLAUDE.md that sets the rules Claude Code follows.',
    checks: [
      { id: 'project', label: 'I created the SRE Learning Project and added the instructions', manual: true },
      { id: 'knowledge', label: 'I added my-environment.md (no secrets) to the Project knowledge', manual: true },
      { id: 'folder', label: 'Claude Code created ' + WS.folder + ' with CLAUDE.md, .gitignore and a first commit', manual: true },
      { id: 'test', label: 'The setup-check chat shows Claude picked up my instructions', manual: true },
    ],
  };

  /* ---------- end-of-week wrap-up step ---------- */
  const wrapStep = (w) => {
    const n = pad(w.week), dir = WS.weekDir(w.week);
    return {
      id: 'w' + n + '-wrap', kind: 'guide', workspace: 'wrap', title: 'Week ' + w.week + ' wrap-up: update your SRE Learning Project', minutes: 15, source: HELP,
      scenario: 'Close the week by turning your notes into a summary and adding it to the Project knowledge. From next week on, every chat in the Project knows what you have already built and learned.',
      task: [
        'Open <code>' + dir + '/notes.md</code> and check it has an entry for every "Do it in Claude" step this week (prompt 1 does it for you).',
        'In a new Project chat named <code>W' + n + ' · Wrap-up</code>, run prompt 2 with your notes pasted in.',
        'Save the answer as <code>' + dir + '/summary.md</code> and add it to <b>Project → Files</b>.',
        'Commit the week from <code>' + dir + '</code>, as shown in the Claude Code steps on the right.',
      ],
      prompts: [
        { label: 'Check the week is complete', where: 'Claude Code', note: 'Run in <code>' + WS.folder + '/' + dir + '</code>.', text: 'Read notes.md in this folder and list the week ' + w.week + ' steps that have no entry, or whose entry is missing "What I verified" or "Evidence". Don\'t edit anything; just list what I need to fill in.' },
        { label: 'Summarise the week', where: 'claude.ai', text: 'This is the end of week ' + w.week + ' (' + w.title + ') of my SRE programme. Here are my notes:\n[paste ' + dir + '/notes.md]\n\nWrite a markdown file titled "Week ' + n + ' summary" with: what I built, commands and facts I verified (with the doc), mistakes Claude made that I caught, open questions, and three things to carry into next week. Keep it under 300 words.' },
      ],
      expected: ['Every step this week has a notes entry with evidence', 'A short Week ' + n + ' summary saved in ' + dir + ' and added to the Project knowledge', 'A commit for the week in your workspace repo'],
      verify: 'Read the summary before you add it to the Project. Anything wrong in it will be treated as fact by every later chat.',
      atWork: 'The same habit works for real projects: a short written summary after each piece of work keeps the team\'s Project context accurate and makes handovers easy.',
      checks: [
        { id: 'notes', label: 'notes.md has an entry for every guide step this week', manual: true },
        { id: 'summary', label: 'I added the week summary to the SRE Learning Project knowledge', manual: true },
        { id: 'commit', label: 'I committed the week in my workspace repo', manual: true },
      ],
    };
  };

  /* ---------- wire it into the programme ---------- */
  PL.PROGRAM.weeks.forEach((w) => {
    const topics = w.topics || [];
    if (!topics.length) return;
    if (w.week === 1 && topics[0].steps && !topics[0].steps.some((s) => s.id === setupStep.id)) topics[0].steps.unshift(setupStep);
    topics.forEach((t) => (t.steps || []).forEach((s) => {
      if (s.kind !== 'guide' || s.workspace) return;
      s.workspace = 'step';
      s.checks = s.checks.concat([
        { id: 'ws-run', label: 'I ran this in my SRE Learning workspace (Project chat named ' + s.id.toUpperCase() + ', or the ' + WS.weekDir(w.week) + ' folder)', manual: true },
        { id: 'ws-note', label: 'I added this step to ' + WS.weekDir(w.week) + '/notes.md with what I verified and the evidence', manual: true },
      ]);
    }));
    const last = topics[topics.length - 1];
    if (!last.steps.some((s) => s.workspace === 'wrap')) last.steps.push(wrapStep(w));
  });
})();

const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const io = require('@actions/io');
const ioUtil = require('@actions/io/lib/io-util');

const { readdirSync } = require('fs');
const path = require('path');

async function run() {

  try {
    const accessToken = core.getInput('access-token');

    const sourceRepo = `${github.context.repo.owner}/${github.context.repo.repo}`;
    let sourceBranch = github.context.ref.replace('refs/heads/', '')
    sourceBranch = sourceBranch.replace('refs/tags/', '')
    const sourceChartsDir = core.getInput('source-charts-folder') ? core.getInput('source-charts-folder') : 'charts';

    const helmPackageArgs = core.getInput('helm-package-args');

    const destinationRepo = core.getInput('destination-repo');
    const destinationBranch = core.getInput('destination-branch') ? core.getInput('destination-branch') : 'master'
    const destinationChartsDir = core.getInput('destination-charts-folder') ?core.getInput('destination-charts-folder') : 'charts';

    let useHelm3 = true;
    if (!core.getInput('helm-version')) {
      useHelm3 = true
    }
    else useHelm3 = core.getInput('helm-version') === 'v3' ? true : false;

    console.log('Running Push Helm Chart job with:')
    console.log('Source Branch:' + sourceBranch)
    console.log('Source Charts Directory:' + sourceChartsDir)
    console.log('Destination Repo:' + destinationRepo)
    console.log('Destination Branch:' + destinationBranch)
    console.log('Destination Charts Directory:' + destinationChartsDir)
    console.log('Package args:' + helmPackageArgs)

    if (!accessToken) {
      core.setFailed(
        'No personal access token found. Please provide one by setting the `access-token` input for this action.'
      );
      return;
    }

    if (!destinationRepo) {
      core.setFailed(
        'No destination repository found. Please provide one by setting the `destination-repos` input for this action.'
      );
      return;
    }

    if (useHelm3) {
      await InstallHelm3Latest();
    }

    await ConfigureGit()
    await CloneGitRepo(sourceRepo, sourceBranch, accessToken, 'sourceRepo')
    await CloneGitRepo(destinationRepo, destinationBranch, accessToken, 'destinationRepo')

    await PackageHelmCharts(`./${sourceChartsDir}`, `../destinationRepo/${destinationChartsDir}`, helmPackageArgs)

    await GenerateIndex()
    await AddCommitPushToGitRepo(`./destinationRepo`, `${github.context.sha}`, destinationBranch)

  } catch (error) {
    core.setFailed(error.message);
  }
}

const getDirectories = fileName =>
  readdirSync(fileName, {
    withFileTypes: true,
  })
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => !(/(^|\/)\.[^\/\.]/g).test(dirent))
    .map(dirent => dirent.name);
    
const InstallHelm3Latest = async () =>  {
  await exec.exec(`curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3`, [], { cwd: `./` });
  await exec.exec(`chmod 700 get_helm.sh`, [], { cwd: `./` });
  await exec.exec(`./get_helm.sh`, [], { cwd: `./` });

  await exec.exec(`helm version`, [], { cwd: `./` }
  )
}

const ConfigureGit = async () => {
  
  await exec.exec(`git config --global user.name`, [github.context.actor], {
    cwd: './',
  });
  
  await exec.exec(
    `git config --global user.email`,
    [`${github.context.actor}@users.noreply.github.com`],
    { cwd: './' }
  );
}

const CloneGitRepo = async (repoName, branchName, accessToken, cloneDirectory) => {

  const repoURL = `https://${accessToken}@github.com/${repoName}.git`;
  await exec.exec(`git clone`, ['-b', branchName, repoURL, cloneDirectory], {
    cwd: './',
  });

}

const PackageHelmCharts = async (chartsDir, destinationChartsDir, helmArgs) => {

  const chartDirectories = getDirectories(path.resolve(chartsDir));

  const args = helmArgs.split(" ")

  console.log('Charts dir content');
  await exec.exec(`ls`, ['-I ".*"'], { cwd: chartsDir });
  for (const chartDirname of chartDirectories) {

    var chartArgs = [chartDirname, '--destination', destinationChartsDir]
    var packageArgs = chartArgs.concat(args)

    console.log(`Resolving helm chart dependency in directory ${chartDirname}`);
    await exec.exec(
      `helm dependency update`,
      [],
      { cwd: `${chartsDir}/${chartDirname}` }
    );
    
    console.log(`Packaging helm chart in directory ${chartDirname}`);
    await exec.exec(
      `helm package`,
      packageArgs,
      { cwd: chartsDir }
    );
  }
  console.log('Packaged all helm charts.');
}

const GenerateIndex = async () => {

  // generate index
  console.log(`Building index.yaml`);
  await exec.exec(`helm repo index`, `./destinationRepo`);
  console.log(`Successfully generated index.yaml.`);
}

const AddCommitPushToGitRepo = async (workingDir, gitSha, branch) =>  {
  await exec.exec(`git status`, [], { cwd: workingDir });
  await exec.exec(`git add`, ['.'], { cwd: workingDir });
  await exec.exec(`git status`, [], { cwd: workingDir });
  await exec.exec(
      `git commit`,
      ['-m', `Deployed via Helm Publish Action for ${gitSha}`],
      { cwd: workingDir }
    );
    await exec.exec(`git push`, ['-u', 'origin', `${branch}`], 
      { cwd: workingDir }
    );
    console.log(`Pushed to ${workingDir}`);
}

run();

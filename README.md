# Helm Publish For Microservices

GitHub Action to package and deploy your Helm charts to GitHub Pages

Based upon [helm-gh-pages-action](https://github.com/funkypenguin/helm-gh-pages-action)

## Usage

This GitHub Action allows you to co-locate your Helm Chart alongside your application code. When pushing/submitting a pull request, the Helm Chart can be produced as an artifact to a Helm Chart repository hosted using GitHub Pages. 

The Action will run `helm package` for every chart folder in the `charts` directory of your repository and
deploy it to GitHub Pages. A basic example workflow is below:

```yml
name: Helm Publish

on:
  push:
    branches:
      - dev

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: dave-mcconnell/helm-gh-pages-microservices@master
        with:
          access-token: ${{ secrets.CR_TOKEN }}
          source-charts-folder: 'test-charts' // location of helm charts in your code repo
          destination-repo: yourusername/helm-charts-repo
```

### Configuration Options

This Action is fairly simple but it does provide you with a couple of
configuration options:

- **access-token**: A [GitHub Personal Access Token][github-access-token] with
  the `repo` scope. This is **required** to push the site to your repo after
  Helm finished building it. You should store this as a [secret][github-repo-secret]
  in your repository. Provided as an [input][github-action-input].

- **source-charts-folder**: The folder to package helm charts from. 
Defaults to `charts`.

- **destination-repo**: The destination repository you want to push your Helm chart to. 
This is a required field.

- **destination-branch**: The destination branch you want to push your Helm chart to. 
Defaults to `master`.

- **destination-charts-folder**: The destination folder you want to copy the packages Helm chart to. 
Defaults to `charts`.

- **destination-charts-folder**: The version of Helm you're using - either v2 or v3. 
Defaults to `v3`.

- **helm-package-args**: Additional arguments to helm package command
Defaults to ''

### Org or User Pages

Create a repository with the format `<YOUR/ORG USERNAME>.github.io`, push your
helm sources to a branch other than `master` and add this GitHub Action to
your workflow! 🚀😃

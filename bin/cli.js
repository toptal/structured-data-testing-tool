#! /usr/bin/env node
const yargs = require(`yargs`)
const chalk = require('chalk')
const fs = require('fs')
const { structuredDataTest } = require('../index')
const presets = require('../presets')
const { schemas } = require('../lib/schemas')
const Package = require('../package')
const { error, printTestResults, printSupportedPresets, printListSchemas } = require('../lib/cli')

;(async () => {

  let showHelp = false
  let testInput = null
  let testOptions = {
    presets: [],
    schemas: []
   }

   if (yargs.argv.help || yargs.argv.h) {
    showHelp = true
   }

  // Get input arguments
  if (yargs.argv.file || yargs.argv.f) {

    if (yargs.argv.url || yargs.argv.u) {
      console.error(error(`Error: Must provide either URL (-u/--url) *or* file (-f/--file) to test, not both`))
      return process.exit(1)
    }

    // Get path to file input
    try {
      testInput = fs.readFileSync(yargs.argv.file || yargs.argv.f)
    } catch (e) {
      console.error(error(`Error: Unable to open file '${yargs.argv.file || yargs.argv.f}'`))
      return process.exit(1)
    }
  } else if (yargs.argv.url || yargs.argv.u) {
    // Get URL argument
    testInput = yargs.argv.url || yargs.argv.u
  }

  // If --schemas or -s is passed display supported schemas
  if (yargs.argv.schemas || yargs.argv.s) {
    if ((yargs.argv.schemas && yargs.argv.schemas === true) || (yargs.argv.s && yargs.argv.s === true)) {
      printListSchemas()
      return process.exit()
    }

    let schemaErrors = []
    const schemaArgs = yargs.argv.schemas || yargs.argv.s
    schemaArgs.split(',').map(schema => {
      let [ structuredDataType, schemaName ] = schema.trim().split(':')
      if (!schemaName) {
        schemaName = structuredDataType
        structuredDataType = null
      }
      
      if (schemas[schemaName]) {
        testOptions.schemas.push(schema)
      } else {
        schemaErrors.push(`Error: "${schemaName}" is not a valid schema.`)
      }
    })

    // If errors, display them and exit
    if (schemaErrors.length > 0) {
      printListSchemas()
      schemaErrors.map(err => console.error(error(err)))
      return process.exit(1)
    }
  }

  // Parse presets of provided, and halt on error when parsing them
  if (yargs.argv.presets || yargs.argv.p) {

    // If --presets or -p is passed with no arguments, display supported presets
    if ((yargs.argv.presets && yargs.argv.presets === true) || (yargs.argv.p && yargs.argv.p === true)) {
      printSupportedPresets()
      return process.exit()
    }

    let presetErrors = []
    const presetArgs = yargs.argv.presets || yargs.argv.p
    presetArgs.split(',').map(preset => {
      if (presets[preset.trim()]) {
        testOptions.presets.push(presets[preset.trim()])
      } else {
        presetErrors.push(`Error: "${preset.trim()}" is not a valid preset.`)
      }
    })

    // If errors, display them and exit
    if (presetErrors.length > 0) {
      printSupportedPresets()
      presetErrors.map(err => console.error(error(err)))
      return process.exit(1)
    }
  }

  if (testInput && !showHelp) {
    // Run test
    await structuredDataTest(testInput, testOptions)
    .then(res => {
      printTestResults(res)
      return process.exit()
    })
    .catch(err => {
      if (err.type === 'VALIDATION_FAILED') {
        printTestResults(err.res)
      } else {
        // Handle other errors (e.g. fetching URL)
        throw err
      }
      return process.exit(1)
    })
  }

  // if (yargs.argv.config && yargs.argv.config !== true) { }

  yargs
  .usage(`Usage: ${ chalk.yellowBright('$0 --url <url> [--presets <presets>] [--schemas <schemas]')}`)
  // .option('c', {
  //   alias: 'config',
  //   description: 'Use configuration file'
  // })
  .option('u', {
    alias: 'url',
    type: 'string',
    description: 'Inspect a URL'
  })
  .implies('--url', '--presets')
  .option('f', {
    alias: 'file',
    type: 'string',
    description: 'Inspect a file'
  })
  .implies('--file', '--presets')
  .option('p', {
    alias: 'presets',
    type: 'string',
    description: 'Test for specific markup from a list of presets'
  })
  .option('s', {
    alias: 'schemas',
    type: 'string',
    description: 'Test for a specific schema from a list of schemas'
  })
  .help('h')
  .alias('h', 'help')
  .version(Package.version)
  .alias('v', 'version')
  .showHelpOnFail(true)
  .demandOption('--url or --file')
  .hide('--url or --file')
  //.example(chalk.cyan(`$0 --config path/to/config.js`), chalk.grey('Load URL(s) and tests from a configuration file'))
  .example(chalk.cyan(`$0 --url "https://example.com/article"`), chalk.grey('Inspect a URL'))
  .example(chalk.cyan(`$0 --url <url> --presets "Twitter,Facebook"`), chalk.grey('Test a URL for specific metatags'))
  .example(chalk.cyan(`$0 --url <url> --presets "SocialMedia"`), chalk.grey('Test a URL for social media metatags'))
  .example(chalk.cyan(`$0 --url <url> --presets "Google"`), chalk.grey('Test a URL for markup inspected by Google'))
  .example(chalk.cyan(`$0 --url <url> --schemas "Article"`), chalk.grey('Test a URL for the Article schema'))
  .example(chalk.cyan(`$0 --url <url> --schemas "jsonld:Article"`), chalk.grey('Test a URL for the Article schema in JSON-LD'))
  .example(chalk.cyan(`$0 --url <url> --schemas "microdata:Article"`), chalk.grey('Test a URL for the Article schema in microdata/HTML'))
  .example(chalk.cyan(`$0 --url <url> --schemas "rdfa:Article"`), chalk.grey('Test a URL for the Article schema in RDFa'))
  .example(chalk.cyan(`$0 --presets`), chalk.grey('List all built-in presets'))
  .example(chalk.cyan(`$0 --schemas`), chalk.grey('List all supported schemas'))
  .wrap(120)
  .argv
  
})()
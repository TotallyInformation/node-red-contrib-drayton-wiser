/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable jsdoc/newline-after-description, jsdoc/require-param */

/**
 * https://semaphoreci.com/community/tutorials/getting-started-with-gulp-js
 * https://gulpjs.com/plugins/
 * https://gulpjs.com/docs/en/api/concepts/
 * Plugins
 *  https://www.npmjs.com/package/gulp-include - source file inline replacements
 *  https://www.npmjs.com/package/gulp-uglify  - Minify
 *  https://www.npmjs.com/package/gulp-rename  - Rename source filename on output
 *  https://www.npmjs.com/package/gulp-once    - Only do things if files have changed
 *  https://www.npmjs.com/package/gulp-replace - String replacer
 *  https://www.npmjs.com/package/gulp-debug
 *  https://github.com/jonschlinkert/gulp-htmlmin
 * 
 *  https://www.npmjs.com/package/gulp-concat
 *  https://www.npmjs.com/package/gulp-sourcemaps
 *  https://www.npmjs.com/package/gulp-prompt  - get input from user
 *  https://www.npmjs.com/package/gulp-if-else
 *  https://www.npmjs.com/package/gulp-minify-inline
 *  https://www.npmjs.com/package/gulp-tap - Easily tap into a pipeline. Could replace gulp-replace
 *  https://www.npmjs.com/package/webpack-stream - Use WebPack with gulp
 *  https://www.npmjs.com/package/tinyify - runs various optimizations
 * 
 *  ❌https://www.npmjs.com/package/gulp-changed - Does not work as expected
 */

'use strict'

const { src, dest, series, watch, parallel, } = require('gulp')
const uglify = require('gulp-uglify')
const rename = require('gulp-rename')
const include = require('gulp-include')
const once = require('gulp-once')
//const prompt = require('gulp-prompt')
const replace = require('gulp-replace')
const debug = require('gulp-debug')
const htmlmin = require('gulp-htmlmin')
const execa = require('execa')
const fs = require('fs')
//const { promisify } = require('util')
//const dotenv = require('dotenv')

const nodeDest = 'nodes'

// print output of commands into the terminal
const stdio = 'inherit'

// @ts-ignore
const { version } = JSON.parse(fs.readFileSync('package.json'))

//npm version 4.2.1 --no-git-tag-version --allow-same-version
const release = '1.0.0-dev'

console.log(`Current Version: ${version}. Requested Version: ${release}`)

/** 
 * TODO
 *  - Add text replace to ensure 2021 in (c) blocks is current year
 */

/** Combine the parts of wiser.html */
function buildPanelWiser1(cb) {
    src('src/editor/wiser/editor.js')
        .pipe(uglify())
        .pipe(rename('editor.min.js'))
        .pipe(dest('src/editor/wiser'))

    cb()
}
/** compress */
function buildPanelWiser2(cb) {
    src('src/editor/wiser/main.html')
        .pipe(include())
        .pipe(rename('wiser.html'))
        .pipe(htmlmin({ collapseWhitespace: true, removeComments: true, processScripts: ['text/html'], removeScriptTypeAttributes: true }))
        .pipe(dest(nodeDest))

    cb()
}

/** Combine the parts of uib-sender.html */
function buildPanelListen(cb) {
    src('src/editor/wiser-listen/main.html')
        .pipe(include())
        //.pipe(once())
        .pipe(rename('wiser-listen.html'))
        .pipe(htmlmin({ collapseWhitespace: true, removeComments: true, minifyJS: true }))
        .pipe(dest(nodeDest))

    cb()
}

const buildme = parallel(series(buildPanelWiser1, buildPanelWiser2), buildPanelListen )

/** Watch for changes during development editor */
function watchme(cb) {
    // Pack panel .js if it changes - creates .min.js
    watch(['src/editor/wiser/editor.js'], buildPanelWiser1)
    // Re-combine and minimise .html if the source changes - ignore changes to .js, those are handled above
    watch(['src/editor/wiser/*', '!src/editor/wiser/editor.js'], buildPanelWiser2)
    // Re-combine and minimise wiser-listen
    watch(['src/editor/wiser-listen/*'], buildPanelListen)

    cb()
}

/** Set version in package.json */
async function setPackageVersion() {
    if (version !== release) {
        console.log(`Changing release version in package.json to ${version} from ${release}`)
        // bump version without committing and tagging
        await execa('npm', ['version', release, '--no-git-tag-version'], {stdio})
    } else {
        console.log(`Requested version is same as current version - nothing will change. ${version}`)
    }
}

/** Create a new GitHub tag for a release (only if release ver # different to last committed tag) */
async function createTag(cb) {
    console.log(`Creating GitHub Tag with version string: ${version} \n  If the version is wrong, please change in gulpfile.js.`)

    //Get the last committed tag: git describe --tags --abbrev=0
    let lastTag
    try {
        lastTag = (await execa('git', ['describe', '--tags', '--abbrev=0'])).stdout
    } catch (e) {
        lastTag = ''
    }
    
    console.log(`Last committed tag: ${lastTag}`)

    // If the last committed tag is different to the required release ...
    if ( lastTag.replace('v','') !== release ) {
        console.log(`Creating new git tag of v${release} and pushing to GitHub.`)
        //const commitMsg = `chore: release ${release}`
        //await execa('git', ['add', '.'], { stdio })
        //await execa('git', ['commit', '--message', commitMsg], { stdio })
        await execa('git', ['tag', `v${release}`], { stdio })
        await execa('git', ['push', '--follow-tags'], { stdio })
        await execa('git', ['push', 'origin', '--tags'], { stdio })
    } else {
        console.log(`Requested release version (${version}) is same as the latest tag - not creating tag`)
    }
    cb()
}

/** Publish to npmjs.org registry as a public package */
async function publish(cb) {
    await execa('npm', ['publish', '--access', 'public'], { stdio })

    cb()
}

exports.default     = series( buildme ) // series(runLinter,parallel(generateCSS,generateHTML),runTests)
exports.watch       = watchme
exports.buildPanelWiser = series(buildPanelWiser1, buildPanelWiser2)
exports.build       = buildme
exports.createTag   = series( setPackageVersion, createTag)
exports.setVersion  = series( setPackageVersion )
exports.publish     = publish

/*
 * "npmtags": "npm dist-tag ls node-red-contrib-drayton-wiser",
 * "npmtagnext": "npm dist-tag add node-red-contrib-drayton-wiser@$npm_package_version next",
 * "gitmergemain": "git merge origin/main",
 */
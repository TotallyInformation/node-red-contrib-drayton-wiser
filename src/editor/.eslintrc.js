/** JavaScript Versions
 *  5 is minimum -> Last IE11
 *  6 = 2015 -> Node >8.10, iOS12+
 *  7 = 2016 -> FF78+,
 *  8 = 2017 -> Node 10.9+
 *  9 = 2018 -> Node 12.11+
 * 10 = 2019 -> Node 12.20 LTS
 * 11 = 2020 -> Node 14 LTS
 * 12 = 2021 -> Node 16
 */

module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2015: true,
    node: false,
    jquery: true,
  },

  root: true,

  extends: 'standard', // 'eslint:recommended',

  parserOptions: {
    ecmaVersion: 2015
  },

  globals: {
    RED: true,
  },

  rules: {
    'allowSingleLineBlocks': true,
    'comma-dangle': 'off',
    'quote-props': 'off',
  }
}

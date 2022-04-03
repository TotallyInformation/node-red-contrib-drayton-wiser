const axios = require('axios').default /** see https://github.com/axios/axios */

// const controllerAddr = 'http://192.168.1.xxx'
// const controllerSecret = 'xxxxxxxxxxxx'
// Put your addr and secret in a _local.js file that isn't added to git
const {controllerAddr, controllerSecret} = require('./_local')

const axiosConfig = {
    //url: undefined,
    baseURL: controllerAddr,
    //method: undefined,
    headers: {
        'SECRET': controllerSecret,
        'Content-Type': 'application/json;charset=UTF-8',
    },
    //httpAgent: new http.Agent({ keepAlive: true }),
}

axios.get('/data/domain/System/BrandName/', axiosConfig)
  .then(function (response) {
    // handle success
    console.log(response.data);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
  .then(function () {
    // always executed
  })
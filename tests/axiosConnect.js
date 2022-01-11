const axios = require('axios').default /** see https://github.com/axios/axios */

const axiosConfig = {
    //url: undefined,
    baseURL: 'http://192.168.1.xxx',
    //method: undefined,
    headers: {
        'SECRET': 'xxxxxxxxxxxx',
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
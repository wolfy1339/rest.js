module.exports = apiMethod

const clone = require('lodash/clone')
const defaultsDeep = require('lodash/defaultsDeep')
const mapKeys = require('lodash/mapKeys')

const deprecate = require('../../deprecate')
const validate = require('./validate')

function apiMethod (octokit, endpointDefaults, endpointParams, options, callback) {
  // Do not alter passed options (#786)
  options = clone(options) || {}

  // lowercase header names (#760)
  options.headers = mapKeys(options.headers, (value, key) => key.toLowerCase())

  if (endpointDefaults.deprecated) {
    deprecate(endpointDefaults.deprecated)
    delete endpointDefaults.deprecated
  }

  const endpointOptions = defaultsDeep(options, endpointDefaults)

  const promise = Promise.resolve(endpointOptions)
    .then(validate.bind(null, endpointParams))
    .then(octokit.request)
    // workaround for getRef / listRefs. Both endpoint currently use
    // the same endpoint: `GET /repos/:owner/:repo/git/refs/<prefix or ref name>`
    // depending on whether <prefix or ref name> matches a git reference
    // exactly or if it matches multiple references as prefix, the server
    // responds with an object or an array. We make sure that the responses of
    // `.getRef()` & `.listRefs()` are predictable by checking the endpointParams,
    // see https://github.com/octokit/rest.js/issues/1061
    .then(response => {
      if (endpointDefaults.url === '/repos/:owner/:repo/git/refs/:ref') {
        if (!Array.isArray(response.data)) {
          return response
        }

        // simulate 404 error
        const error = new Error('Not found')
        error.name = 'HttpError'
        error.code = 404
        error.status = 'Not Found'
        response.headers.status = '404 Not Found'
        error.headers = response.headers
        throw error
      }

      if (endpointDefaults.url === '/repos/:owner/:repo/git/refs/:namespace') {
        if (!Array.isArray(response.data)) {
          response.data = [response.data]
        }
      }

      return response
    })
    .catch(error => {
      if (endpointDefaults.url !== '/repos/:owner/:repo/git/refs/:namespace') {
        throw error
      }

      if (error.code === 404) {
        error.headers.status = '200 OK'
        return {
          data: [],
          status: 200,
          headers: error.headers
        }
      }

      throw error
    })

  if (callback) {
    promise.then(callback.bind(null, null), callback)
    return
  }

  return promise
}

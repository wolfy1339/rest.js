require('../mocha-node-setup')

const endpointMethods = require('../../lib/plugins/endpoint-methods')

describe('endpointMethods(octokit)', () => {
  it('exposes endpoint defaults', () => {
    const methods = endpointMethods({})
    
    expect(Object.keys(methods.repos.get.method)).toEqual("GET")
    expect(Object.keys(methods.repos.get.headers)).toEqual({
      "accept": "application/vnd.github.drax-preview+json"
    })
    expect(Object.keys(methods.repos.get.url)).toEqual("/repos/:owner/:repo")
    expect(Object.keys(methods.repos.get.params)).toEqual(["owner", "repo"])
  })
})

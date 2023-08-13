import http from 'k6/http'
import { check, sleep } from 'k6'
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js'
import { describe } from 'https://jslib.k6.io/expect/0.0.4/index.js'
import { describe as xdescribe, expect as xexpect } from 'https://jslib.k6.io/k6chaijs/4.3.4.0/index.js'
import { jUnit } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'
import { Counter, Gauge, Rate } from 'k6/metrics'

let myErrorCounter = new Counter('requests with 404 status code')
const myGauge = new Gauge('response time duration')
const myGauge2 = new Gauge('response time waiting')
const myGauge3 = new Gauge('response time sending')
const myGauge4 = new Gauge('response time receiving')
const myRate = new Rate('error codes')

const isNumeric = (value) => /^\d+$/.test(value)

const default_vus = 5

const target_vus_env = `${__ENV.TARGET_VUS}`
const target_vus = isNumeric(target_vus_env) ? Number(target_vus_env) : default_vus

export let options = {
  noConnectionReuse: true,
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(90) < 600', 'p(95) < 800', 'p(99.9) < 2000']
  },
  vus: target_vus,
  stages: [
    // Ramp-up from 1 to TARGET_VUS virtual users (VUs) in 5s
    { duration: '5s', target: target_vus },
    // Stay at rest on TARGET_VUS VUs for 10s
    { duration: '10s', target: target_vus },
    // Ramp-down from TARGET_VUS to 0 VUs for 5s
    { duration: '5s', target: 0 }
  ]
}

export default function () {
  describe('Basic API test', (t) => {
    const response = http.get('https://gorest.co.in/public/v2/users', { headers: { Accepts: 'application/json' } })
    if (response.status === 404) {
      // custom metrics for status code
      myErrorCounter.add(1)
    }
    myGauge.add(response.timings.duration) // custom gauge for response time duration
    myGauge2.add(response.timings.waiting) // custom gauge for response time waiting
    myGauge3.add(response.timings.sending) // custom gauge for response time sending
    myGauge4.add(response.timings.receiving) // custom gauge for response time receiving
    myRate.add(response.error_code)
    t.expect(response.status) //chai assertions
      .as('API status code')
      .toEqual(200)
      .and(response.json().length)
      .toEqual(10)
      .and(typeof response.json()[0])
      .toEqual('object')
      .and(Object.keys(response.json()[0]).length)
      .toEqual(5)
    check(response, { 'status is 200': (r) => r.status === 200 }) // native assertions
    check(response, {
      'transaction time OK': (r) => r.timings.duration < 400,
      'response body has ID key': (r) => r.json().id === 1831351
    })
  })
  xdescribe('Dummy example', () => {
    xexpect(10).to.be.within(8, 12) // OK
    xexpect(42).to.equal(44) // fails
    xexpect(true).to.be.ok // doesn't run because the previous assertion failed.
  })
}
export function handleSummary(data) {
  console.log(`Metrics for error codes: ${JSON.stringify(data.metrics['error codes'].values)}`)
  return {
    'summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    './summary.json': JSON.stringify(data),
    './summary.xml': jUnit(data)
  }
}

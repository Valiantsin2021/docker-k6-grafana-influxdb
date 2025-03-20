import { describe } from 'https://jslib.k6.io/expect/0.0.4/index.js'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js'
import { jUnit } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js'
import { check } from 'k6'
import http from 'k6/http'
import { Counter, Gauge } from 'k6/metrics'

let myErrorNotFound = new Counter('requests_with_404_status_code')
const myGauge = new Gauge('response_time_duration')
const myGauge2 = new Gauge('response_time_waiting')
const myGauge3 = new Gauge('response_time_sending')
const myGauge4 = new Gauge('response_time_receiving')
let myServerErrors = new Counter('error_codes')

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
  rate: 100,
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
  describe('Test TODOS API', (t) => {
    const response = http.get('https://apichallenges.eviltester.com/todos', { headers: { Accepts: 'application/json' } })
    if (response.status === 404) {
      // custom metrics for status code
      myErrorNotFound.add(1)
    } else if (500 <= response.status < 599) {
      myServerErrors.add(1)
    }
    myGauge.add(response.timings.duration) // custom gauge for response time duration
    myGauge2.add(response.timings.waiting) // custom gauge for response time waiting
    myGauge3.add(response.timings.sending) // custom gauge for response time sending
    myGauge4.add(response.timings.receiving) // custom gauge for response time receiving
    t.expect(response.status) //chai assertions
      .as('API status code')
      .toEqual(200)
    t.expect(response.json().todos.length).as('todos length').toEqual(10)
    t.expect(typeof response.json().todos[Math.floor(Math.random() * 10)])
      .as('todos type')
      .toEqual('object')
    t.expect(Object.keys(response.json().todos[Math.floor(Math.random() * 10)]).length)
      .as('todos keys length')
      .toEqual(4)
    check(response, {
      'status is 200': (r) => r.status === 200,
      'transaction time OK': (r) => r.timings.duration < 400
    })
  })
}

export function handleSummary(data) {
  console.log(`Metrics for error codes: ${JSON.stringify(data.metrics['error codes'])}`)
  return {
    'summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    './summary.json': JSON.stringify(data),
    './summary.xml': jUnit(data)
  }
}

# MoveMind AI targeted fixes

## Changed files
- `README.md`
- `client/src/App.jsx`
- `server/src/agent.js`
- `server/src/data.js`
- `server/src/index.js`
- `server/src/riskEngine.js`
- `server/src/routes.js`
- `server/src/validation.js`
- `server/test/api.test.js` (new)
- `server/test/fixes.test.js` (new)

All files listed above are complete files in this project bundle, not partial snippets.

## Verification status
- Ran `node --test server/test/riskEngine.test.js server/test/fixes.test.js`: 14 tests passed.
- `node --check` passed for every server source and test JavaScript file.
- Manually inspected route geometry calculations using a Node script: route A 2.34 km / 7 min with 4 matched demo reports; route B 3.24 km / 10 min with 3 matched demo reports; route C 9.33 km / 28 min with no matched demo reports. Distances are rounded geometry sums and durations assume 20 km/h.
- `npm install` timed out in this environment. As a result, API tests requiring Express and the frontend production build were not run here.

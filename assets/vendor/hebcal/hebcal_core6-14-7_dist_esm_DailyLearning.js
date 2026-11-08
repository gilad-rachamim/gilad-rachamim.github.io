/**
 * Bundled by jsDelivr using Rollup v4.62.2 and esbuild v0.28.1.
 * Original file: /npm/@hebcal/core@6.14.7/dist/esm/DailyLearning.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
const a=new Map;class n{static addCalendar(t,e,r){if(typeof e!="function")throw new TypeError(`Invalid calendar function: ${e}`);a.set(t.toLowerCase(),{fn:e,startDate:r})}static lookup(t,e,r){const s=a.get(t.toLowerCase());return s?s.fn(e,r):null}static getStartDate(t){return a.get(t.toLowerCase())?.startDate}static has(t){return a.has(t.toLowerCase())}static getCalendars(){return[...a.keys()]}}export{n as DailyLearning};

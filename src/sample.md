---
title: IMLGS Sample
theme: dashboard
sidebar: collapse
---
```js
import {IMLGSData, newInputObserver, getIdFromURL, addJSONLD} from "./lib/common.js";

//-----
// From: https://github.com/stevebest/julian/blob/master/index.js

const DAY = 86400000;
const UNIX_EPOCH_JULIAN_DATE = 2440587.5;
const UNIX_EPOCH_JULIAN_DAY = 2440587;

function convertToDate(julian) {
  return new Date((Number(julian) - UNIX_EPOCH_JULIAN_DATE) * DAY);
};
//---------

function jdToDate(jd) {
    if (jd) {
        const d = convertToDate(jd);
        const year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d);
        const month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(d);
        const day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d);
        return `${year}-${month}-${day}`;
    }
    return jd;
}

const sample_id = Mutable(getIdFromURL());

function setSampleId(v) {
    sample_id.value = v;
}

function locationHashChanged() {
    sample_id.value = getIdFromURL();
    console.log(sample_id.value);
}
```

```js
const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full.parquet";
const imlgs_data = new IMLGSData(pq_source, "imlgs");
await imlgs_data.initialize()

let R = {};
if (sample_id === null) {
    setSampleId("");
} else {
    R = await imlgs_data.getRecord(sample_id);
    addJSONLD(sample_id, imlgs_data.recordToJSONLD(R));
}

window.onhashchange = locationHashChanged;
```

## Data and Information for Sample <code>${R.sample}</code>

```js
html`<table>
<tbody>
<tr><td>Repository</td><td>${R.facility.facility}</td></tr>
<tr><td>Ship/Platform</td><td>${R.platform}</td></tr>
<tr><td>Cruise ID</td><td>${R.cruise.cruise}</td></tr>
<tr><td>Sample ID</td><td>${R.sample}</td></tr>
<tr><td>Sampling Device</td><td>${R.device}</td></tr>
<tr><td>Location</td>${R.geometry}<td></td></tr>
<tr><td>Water Depth (m)</td><td>${R.water_depth}</td></tr>
<tr><td>Date Sample Collected</td><td>${jdToDate(R.begin_jd)}</td></tr>
<tr><td>Principal Investigator</td>${R.pi}<td></td></tr>
<tr><td>Physiographic Province</td>${R.province}<td></td></tr>
<tr><td>Lake</td><td>${R.lake}</td></tr>
<tr><td>Core Length(cm)</td><td>${R.cored_length}</td></tr>
<tr><td>Core Diamter(cm)</td><td>${R.cored_diam}</td></tr>
<tr><td>Sample Comments</td><td>${R.sample_comments}</td></tr>
<tr><td>Repository Archive Overview</td><td><a href='${R.facility.other_link}'>${R.facility.other_link}</a></td></tr>
</tbody>
</table>`
```

## Intervals

```js
html`<div> Foo ${Array.from(R.intervals, (interval, i) => html.fragment
`<table>
<thead><tr><th>Interval ${i}</th><th>${interval.id}</th/tr></thead>
<tbody>
<tr><td>Geologic Age</td><td>${interval.ages}</td></tr>
<tr><td>Description</td><td>${interval.description}</td></tr>
<tr><td>Comments</td><td>${interval.int_comments}</td></tr>
<tr><td></td></tr>
</tbody>
</table>`)}</div>`
```


<pre>
${JSON.stringify(R, null, 2)}
</pre>


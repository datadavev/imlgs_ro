---
title: IMLGS Sample
theme: ["air", "near-midnight", "dashboard"]
sidebar: collapse
toc: false
---
```js
import {
    IMLGSData, 
    getIdFromURL, 
    addJSONLD, 
    jdToDate,
    intervalComment
} from "./lib/common.js";

const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full_2.parquet";
const imlgs_data = new IMLGSData(pq_source, "imlgs");
await imlgs_data.initialize()
```


```js
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

<div class="card">

```js
const sample_data = [
    {k:"Repository", v:R.facility.facility},
    {k:"Ship/Platform", v:R.platform},
    {k:"Cruise ID", v:R.cruise.cruise},
    {k:"Sample ID", v:R.sample},
    {k:"Sampling Device", v:R.device},
    {k:"Location", v:R.geometry},
    {k:"Water Depth (m)", v:R.water_depth},
    {k:"Date Sample Collected", v:jdToDate(R.begin_jd)},
    {k:"Principal Investigator", v:R.pi},
    {k:"Physiographic Province", v:R.province},
    {k:"Lake", v:R.lake},
    {k:"Core Length(cm)", v:R.cored_length},
    {k:"Core Diamter(cm)", v:R.cored_diam},
    {k:"Sample Comments", v:R.sample_comments},
    {k:"Repository Archive Overview", v:`<a> href='${R.facility.other_link}'>${R.facility.other_link}</a>`}
];

//const sample_table = view(Inputs.table(sample_data));
```

```js
html`<table style="width:100%; max-width:100%;">
<tbody>
<tr><td>Repository</td><td>${R.facility.facility}</td></tr>
<tr><td>Ship/Platform</td><td>${R.platform}</td></tr>
<tr><td>Cruise ID</td><td>${R.cruise.cruise}</td></tr>
<tr><td>Sample ID</td><td>${R.sample}</td></tr>
<tr><td>Sampling Device</td><td>${R.device}</td></tr>
<tr><td>Location</td><td><code>${R.geometry}</code></td></tr>
<tr><td>Water Depth (m)</td><td>${R.water_depth}</td></tr>
<tr><td>Date Sample Collected</td><td>${jdToDate(R.begin_jd)}</td></tr>
<tr><td>Principal Investigator</td><td>${R.pi}</td></tr>
<tr><td>Physiographic Province</td><td>${R.province}</td></tr>
<tr><td>Lake</td><td>${R.lake}</td></tr>
<tr><td>Core Length(cm)</td><td>${R.cored_length}</td></tr>
<tr><td>Core Diamter(cm)</td><td>${R.cored_diam}</td></tr>
<tr><td>Sample Comments</td><td>${R.sample_comments}</td></tr>
<tr><td>Repository Archive Overview</td><td><a href='${R.facility.other_link}'>${R.facility.other_link}</a></td></tr>
</tbody>
</table>`
```
</div>

<div class="card">

## Intervals

```js
html`<table style="width:100%; max-width:100%;">
<thead><tr>
<th>Depth</th><th>Geologic Age</th><th>Texture</th><th>Composition</th><th>Lithology</th><th>Comments</th>
</tr></thhead>
<tbody>${Array.from(R.intervals, (interval, i) => html.fragment
`<tr><td>${interval.depth_top} - ${interval.depth_bot}</td>
<td>${interval.ages}</td>
<td>${interval.textures}</td>
<td>${interval.comps}</td>
<td>${interval.liths}</td>
<td>${intervalComment(interval)}</td>
</tr>`)}
</tbody></table>`
```

</div>


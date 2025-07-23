---
theme: dashboard
---

<h1>Index to Marine and Lacustrine Geological Samples</h1>

<details>
    <summary>About</summary>
<div class="grid grid-cols-2">
<div class="note">This site provides a read-only view of a snaptot of the 
<a href='https://www.ncei.noaa.gov/products/index-marine-lacustrine-samples'>Index to Marine and Lacustrine Geological Samples</a>
retrieved immediately prior to site deomissioning on 2025-05-05.</div>
<div class="warning">This is a development site and not the final location of this resource. Links to this site and its content are likely
to break as content evolves.</div>
</div>
</div>
</details>


```js
import {
    IMLGSData, 
    newInputObserver, 
    getIdFromURL, 
    jdToDate,
    intervalComment
} from "./lib/common.js";

const display_fields = [
    "imlgs",
    "platform",
    "device",
    "facility.facility_code as repository",
    "lat",
    "lon"
];

const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full_2.parquet";
const imlgs_data = new IMLGSData(pq_source, "imlgs", display_fields);
await imlgs_data.initialize()
```


```js
const [_platform_input, platform_input] = await imlgs_data.newInputObserver(
    "platform", "Platform", "regexp_matches(platform,?,'i')"
);
const [_device_input, device_input] = await imlgs_data.newInputObserver(
    "device", "Device", "regexp_matches(device,?,'i')"
);
const [_repository_input, repository_input] = await imlgs_data.newInputObserver(
    "facility.facility_code", "Repository", "regexp_matches(facility.facility_code ,?,'i')"
);
display(_platform_input);
display(_device_input);
display(_repository_input);

const selectedRecordJson = Mutable("");

const setSelectedRecordJson =  (v) => {
    if (!v) {
        selectedRecordJson.value = "";
        return;
    }
    selectedRecordJson.value = v;
}

async function updateSelectedRecordJson(pid) {
    console.log(`Update record: ${pid}`);
    if (!pid) {
        setSelectedRecordJson("");
        return;
    }
    const query = `select * from ${imlgs_data.tbl} where imlgs=?`;
    const res = await imlgs_data.db.queryRow(query, [pid]);
    setSelectedRecordJson(JSON.stringify(res, null, 2));
}
```

```js
// This doesn't work
//import {ui_inputs as uii} from "./lib/common.js";

// this does
const ui_inputs = [];

async function getMatchingRecords(inputs) {
    const wc = imlgs_data.getWhereClause(inputs);
    return imlgs_data.getDisplayRecords(wc);
}

async function getMatchingCount(inputs) {
    const wc = imlgs_data.getWhereClause(inputs);
    return imlgs_data.count(wc);
}

ui_inputs.push(platform_input);
ui_inputs.push(device_input)
ui_inputs.push(repository_input);

//const inputs = [platform_input, device_input, repository_input]
let theRecords = getMatchingRecords(ui_inputs);
let recordCount = getMatchingCount(ui_inputs);

```

```js
function doRowClicked(e) {
    const tr = e.target.closest('tr');
    tr.querySelector('input').click();
}

const dataTable = Inputs.table(theRecords, {
    multiple: false,
    required: false,
    select: true,
    format: {
        imlgs: (v) => {return html`<span onclick=${doRowClicked}>${v}</span>`}
    }
});

const tableview = view(dataTable);

dataTable.querySelector('input[value="0"]').click();
```

Matching: ${recordCount}



```js
async function loadSampleRecord(tv) {
    if (!tv) {
        return html`<p>Waiting for record selection...</p>`;
    }
    const R= await imlgs_data.getRecord(tv.imlgs);
    return html`<div class="card">
<table style="width:100%; max-width:100%;">
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
</table>
    </div>

    <div class="card">
<table style="width:100%; max-width:100%;">
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
</tbody></table>
    </div>
    `
}

view(await loadSampleRecord(tableview));
```

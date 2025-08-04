---
theme: dashboard
---

<h1 style="max-width:100%">Index to Marine and Lacustrine Geological Samples</h1>

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
    getIdFromURL, 
    jdToDate,
    intervalComment
} from "./lib/common.js";

const display_fields = [
    "imlgs",
    "sample",
    "igsn",
    "platform",
    "cruise.cruise as cruise",
    "device",
    "facility.facility_code as repository",
    "begin_jd",
    "water_depth",
];

const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full_2.parquet";
//const pq_source = "https://zenodo.org/api/records/16389102/files/imlgs_full_2.parquet/content";
const imlgs_data = new IMLGSData(pq_source, "imlgs", display_fields);
await imlgs_data.initialize()
```

<div class="grid grid-cols-2">

<div class="card">

```js
let recordCount = Mutable(0);

function setRecordCount(v) {
    recordCount.value = v;
}

const [_platform_input, platform_input] = await imlgs_data.newInputObserver(
    "platform", "Platform", "regexp_matches(platform,?,'i')"
);
const [_device_input, device_input] = await imlgs_data.newInputObserver(
    "device", "Device", "regexp_matches(device,?,'i')"
);
const [_repository_input, repository_input] = await imlgs_data.newInputObserver(
    "facility.facility_code", "Repository", "regexp_matches(facility.facility_code ,?,'i')"
);
const [_cruise_input, cruise_input] = await imlgs_data.newTextInputObserver(
    "cruise.cruise", "Cruise", "cruise.cruise=?"
);

display(_platform_input);
display(_device_input);
display(_repository_input);
display(_cruise_input);

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
</div>
<div class="card">
Matching: ${recordCount}
</div>
</div>

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
ui_inputs.push(cruise_input);

//const inputs = [platform_input, device_input, repository_input]
let theRecords = getMatchingRecords(ui_inputs);
setRecordCount(getMatchingCount(ui_inputs));

```

<div class="card">

```js
function sparkbar(max) {
  return (x) => htl.html`<div style="
    background: var(--theme-foreground-faintest);
    color: var(--theme-foreground);
    font: 10px/1.6 var(--sans-serif);
    width: ${100 * x / max}%;
    float: right;
    padding-right: 3px;
    box-sizing: border-box;
    overflow: visible;
    display: flex;
    justify-content: end;">${x.toLocaleString("en-US")}`
}

function dateSparkbar(min, max) {
  return (x) => htl.html`<div style="
    background: Azure;
    color: black;
    font: 10px/1.6 var(--sans-serif);
    width: ${100 * (x-min) / (max-min)}%;
    float: right;
    padding-right: 3px;
    box-sizing: border-box;
    overflow: visible;
    display: flex;
    justify-content: end;">${jdToDate(x)}`
}

function doRowClicked(e) {
    const tr = e.target.closest('tr');
    tr.querySelector('input').click();
}

function doCruiseClicked(e) {
    const v = e.target.innerText;
    _cruise_input.value = v;
    const event = new Event("input");
    _cruise_input.dispatchEvent(event);
}

const dataTable = Inputs.table(theRecords, {
    multiple: false,
    required: false,
    select: true,
    format: {
        imlgs: (v) => {return html`<span onclick=${doRowClicked}>${v}</span>`},
        igsn: (v) => {
            if (v) {
                return html`<a target="_blank" href="https://igsn.rslv.xyz/igsn:${v}">igsn:${v}</a>`
            }
            return v;
        },
        cruise: (v) => {return html`<span onclick=${doCruiseClicked}>${v}</span>`},
        begin_jd: (x) => jdToDate(x),
        water_depth: sparkbar(10415),
    },
    header: {
        "imlgs": "IMLGS ID",
        "sample": "Sample",
        "igsn": "IGSN",
        "platform": "Platform",
        "cruise": "Cruise",
        "device": "Device",
        "repository": "Repository",
        "begin_jd": "Date",
        "water_depth": "Water Depth",
    }
});

const tableview = view(dataTable);

dataTable.querySelector('input[value="0"]').click();
```

</div>


```js
async function loadSampleRecord(tv) {
    if (!tv) {
        return html`<p>Waiting for record selection...</p>`;
    }
    return imlgs_data.getRecordHtml(tv.imlgs);
}

view(await loadSampleRecord(tableview));
```

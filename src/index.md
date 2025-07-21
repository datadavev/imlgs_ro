# IMLGS

Note: This is a work in progress and likely to change.

```js
import {IMLGSData, newInputObserver, getIdFromURL} from "./lib/common.js";

const display_fields = [
    "imlgs",
    "platform",
    "device",
    "facility.facility_code as repository",
    "lat",
    "lon"
];

const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full.parquet";
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

const tableview = view(Inputs.table(theRecords, {
    multiple: false,
    required: false
}));

updateSelectedRecordJson(getIdFromURL());

//${tableview?tableview.imlgs:''}

```

Matching: ${recordCount}


<pre>
${selectedRecordJson}
</pre>


```js
import * as d3 from "npm:d3";

async function getPlotData(inputs) {
    const subset = recordCount > 10000? " using sample 10%" : "";
    let query = `SELECT platform, device, facility.facility_code as repository FROM ${imlgs_data.tbl}`;
    const where_clause = imlgs_data.getWhereClause(inputs);
    query = query + where_clause.clause + subset;
    return await imlgs_data.db.query(query, where_clause.params);
}

//const plot_data = getPlotData(ui_inputs);
```

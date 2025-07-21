---
title: IMLGS Sample
theme: dashboard
sidebar: collapse
---
```js
import {IMLGSData, newInputObserver, getIdFromURL, addJSONLD} from "./lib/common.js";

const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full.parquet";
const imlgs_data = new IMLGSData(pq_source, "imlgs");
await imlgs_data.initialize()

let sample_id = getIdFromURL();
let sample_record = "";
if (sample_id === null) {
    sample_id = "";
} else {
    sample_record = await imlgs_data.getRecord(sample_id);
    addJSONLD(sample_id, imlgs_data.recordToJSONLD(sample_record));
}
```

# IMLGS Sample ${sample_id}

<pre>
${JSON.stringify(sample_record, null, 2)}
</pre>

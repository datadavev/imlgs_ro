# IMLGS
```js
const source_table = "imlgs";
const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full.parquet";
const db = await DuckDBClient.of();
//const ddbversion = await db.queryRow("select version() as version");
await db.query(`create view ${source_table} as select * from read_parquet('${pq_source}')`);
```

```js
const display_fields = [
    "imlgs",
    "platform",
    "device",
    "facility.facility_code as repository",
    "lat",
    "lon"
];

```

```js
const where_clause_join = " AND ";

const the_inputs = [];

const _platform_input = Inputs.text({
        label:"Platform",
        submit: true}
    );
display(_platform_input);

const _device_input = Inputs.text({
        label:"Device",
        submit: true}
    );
display(_device_input);

const _repository_input = Inputs.text({
        label:"Repository",
        submit: true}
    );
display(_repository_input);

const platform_input = Generators.observe((notify) => {
    const inputted = () => notify({"v":_platform_input.value, "c": "regexp_matches(platform,?,'i')"});
    inputted();
    _platform_input.addEventListener("input", inputted);
    return () => _platform_input.removeEventListener("input", inputted);
})

const device_input = Generators.observe((notify) => {
    const inputted = () => notify({"v":_device_input.value, "c": "regexp_matches(device,?,'i')"});
    inputted();
    _device_input.addEventListener("input", inputted);
    return () => _device_input.removeEventListener("input", inputted);
})

const repository_input = Generators.observe((notify) => {
    const inputted = () => notify({"v":_repository_input.value, "c": "regexp_matches(facility.facility_code ,?,'i')"});
    inputted();
    _repository_input.addEventListener("input", inputted);
    return () => _repository_input.removeEventListener("input", inputted);
})

function getIdFromURL() {
    const hash = window.location.hash;
    if (hash.length > 0) {
        return hash.slice(1);
    }
    return null;
}

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
    const query = `select * from ${source_table} where imlgs=?`;
    const res = await db.queryRow(query, [pid]);
    setSelectedRecordJson(JSON.stringify(res, null, 2));
}

```

```js

const _where_clause = Mutable({
    clause: "",
    params: []
});

const update_where_clauses = (c, v) => {
    console.log(`update_where_clauses: ${c}`);
    _where_clause.value = {
        clause: c,
        params: v
    };
}

```

```js
//set_where_clause(the_inputs)


function getWhereClause(inputs) {
    const params = [];
    let where_clause = "";
    if (inputs.length > 0) {
        const clauses = [];
        for (const inp of inputs) {
            if (inp.v) {
                clauses.push(inp.c);
                params.push(inp.v);
            }
        }
        if (params.length > 0){
            where_clause += ` WHERE ${clauses.join(where_clause_join)}`;
        }
    }
    return {"params":params, "clause":where_clause};
}


async function getMatchingRecords(inputs) {
    let query = `SELECT ${display_fields.join(',')} FROM ${source_table}`;
    const wc = getWhereClause(inputs);
    query = query + wc.clause;
    console.log(query);
    return db.query(query, wc.params);
}

async function getMatchingCount(inputs) {
    let query = `SELECT count(*) AS n FROM ${source_table}`;
    const wc = getWhereClause(inputs);
    query = query + wc.clause;
    console.log(query);
    const result = await db.queryRow(query, wc.params);
    return result.n;
}

const inputs = [platform_input, device_input, repository_input]
let theRecords = getMatchingRecords(inputs);
let recordCount = getMatchingCount(inputs);

const table = view(Inputs.table(theRecords));

updateSelectedRecordJson(getIdFromURL());
```

Matching: ${recordCount}

<pre>
${selectedRecordJson}
</pre>

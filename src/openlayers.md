---
title: IMLGS Spatial
theme: dashboard
sidebar: collapse
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


<link rel=stylesheet href="https://cdn.jsdelivr.net/npm/ol@v10.5.0/ol.css" />
<style>
    .map {
        width: 100%;
        height: 600px; 
        position: relative;
    }
    .map:-webkit-full-screen {
        height: 100%;
        margin: 0;
    }
    .map:fullscreen {
        height: 100%;
    }
    #infooverlay {
        position: absolute;
        display: inline-block;
        height: auto;
        width: auto;
        z-index: 100;
        background-color: #333;
        color: #fff;
        text-align: center;
        border-radius: 4px;
        padding: 5px;
        left: 50%;
        transform: translateX(3%);
        visibility: hidden;
        pointer-events: none;
        font-size: 0.8rem;
        font-family: monospace;
    }    
</style>    

```js
/**
 * Initialize a view of the remote data.
 * - create "imlgs" view
 */
async function setupDatasource(src, src_table) {
    const db = await DuckDBClient.of();
    // Spatial extension is loaded from observablehq.config.js
    //await db.query("install sptial");
    //await db.query("load spatial");
    await db.query(`create view ${src_table} as select * from read_parquet('${src}')`);
    return db;
}

const source_table = "imlgs";
const datasource = "https://s3.beehivebeach.com/imlgs/imlgs_full_2.parquet"
const imlgsdb = await setupDatasource(datasource, source_table);

async function listColumns(db, table) {
    const q = `select column_name, column_type from (describe ${table})`;
    const result = await db.query(q);
    //return Array.from(result, (row) => [row.column_name, row.column_type]);
    return result;
}

async function columnStats(db, table, column, key) {
    const q = `select '${key}' as k, min(${column}) as min, max(${column}) as max, count(distinct ${column}) as n from ${table}`;
    return await db.queryRow(q);
}

async function tableSummary(db, table) {
    const cols = await listColumns(db, table);
    const results = [];
    const tasks = [];
    let i = 0;
    for (const col of cols) {
        const row = {
            "Name": col.column_name,
            "Type": col.column_type,
            "Min": null,
            "Max": null,
            "n": null
        }
        results.push(row);
        if (["VARCHAR", "INT", "BIGINT"].includes(col.column_type)) {
            tasks.push(columnStats(db, table, col.column_name, i));
        }
        i += 1;
    }
    await Promise.all(tasks).then((values) => {
        for (const row of values) {
            results[row.k].Min = row.min;
            results[row.k].Max = row.max;
            results[row.k].n = row.n;
        }
    });
    return results;
}
```

```js
const where_clause_join = " AND ";

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

```

```js
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
            where_clause += `${clauses.join(where_clause_join)}`;
        }
    }
    return {"params":params, "clause":where_clause};
}

const the_inputs = [platform_input, device_input, repository_input]
```


```js
function getIdFromURL() {
    const hash = window.location.hash;
    if (hash.length > 0) {
        return hash.slice(1);
    }
    return null;
}

const record_count = Mutable("loading....");

const setRecordCount = (n) => {
    record_count.value = n;
}

const selected_feature = Mutable("");
const setSelectedFeature = (pid, v) => {
    selected_feature.value = v;
    window.location.hash = pid;
}

```

There are ${record_count} matching records.

<!-- The map container -->
<div id="olmap" class="map">
    <div id="infooverlay"></div>
</div>

<pre>
${selected_feature}
</pre>

```js
// OpenLayers pieces
import * as ol from "ol";
import {defaults as defaultControls} from 'ol/control/defaults';
import CircleStyle from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import FullScreen from 'ol/control/FullScreen';
import GeoJSON from 'ol/format/GeoJSON';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import ImageArcGISRest from 'ol/source/ImageArcGISRest';
import OSM from 'ol/source/OSM';
import Select from 'ol/interaction/Select';
import StadiaMaps from 'ol/source/StadiaMaps';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import TileLayer from 'ol/layer/Tile';
import Vector from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import WebGLVectorLayer from 'ol/layer/WebGLVector';
import WKB from 'ol/format/WKB';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import XYZ from 'ol/source/XYZ';
```

```js
/* Some other base layers

    new TileLayer({source: new OSM(),}),
    
    new ImageLayer({
        source: new ImageWMS({
            url: "https://wms.gebco.net/mapserv",
            params: {"LAYERS": "gebco_latest_sub_ice_topo"},
            ratio: 1
        })
    })

   new ImageLayer({
    source: new ImageArcGISRest({
        ratio: 1,
        params: {},
        //url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        url: "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer"
    })
   })

    new TileLayer({
      source: new StadiaMaps({
        layer: 'alidade_satellite',
        retina: true
      })
    }),
*/


async function installMap(mapElement, infoElement) {
    // Setup the ESRI world ocean base layer
    const parser = new WMTSCapabilities();
    const response = await fetch("https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/WMTS/1.0.0/WMTSCapabilities.xml")
        .then(function (response) {
            return response.text();
        })
    const result = parser.read(response);
    const options = optionsFromCapabilities(result, {
        layer: 'Ocean_World_Ocean_Base',
        matrixSet: 'EPSG:3857',
    });
    options.wrapX = true;
    const _target = document.getElementById(mapElement);
    _target.innerHTML = `<div id='${infoElement}'></div>`;
    const map = new ol.Map({
        controls: defaultControls().extend([new FullScreen()]),
        layers: [
            new TileLayer({
                opacity: 1,
                source: new WMTS(options)
            }),
        ],
        target: _target,
        view: new ol.View({
            center: [0, 0],
            zoom: 2,
        }),
    });
    return map;
};
const map = await installMap('olmap', 'infooverlay');
```

```js
const map_data_layers = {
    "samples": null
};
async function makeColors(db) {
    const query = "select distinct facility.facility_code as repository from imlgs";
    const results = await db.query(query);
    const data = [[173, 216, 230],
            [0, 191, 255],
            [30, 144, 255],
            [0,   0, 255],
            [0,   0, 139],
            [72,  61, 139],
            [123, 104, 238],
            [138,  43, 226],
            [128,   0, 128],
            [218, 112, 214],
            [255,   0, 255],
            [255,  20, 147],
            [176,  48,  96],
            [220,  20,  60],
            [240, 128, 128],
            [255,  69,   0],
            [255, 165,   0],
            [244, 164,  96],
            [240, 230, 140],
            [128, 128,   0],
            [139,  69,  19],
            [255, 255,   0],
            [154, 205,  50],
            [124, 252,   0],
            [144, 238, 144],
            [143, 188, 143],
            [34, 139,  34],
            [0, 255, 127],
            [0, 255, 255],
            [0, 139, 139],
            [128, 128, 128],
            [255, 255, 255]];
    const color_rules = ["case"];
    let last_c = 0;
    for (let row of results) {
        const c = data[last_c];
        last_c += 1;
        const _clr = `rgba(${c[0]},${c[1]},${c[2]},0.5)`;
        color_rules.push(["==",["get","repository"], row.repository]);
        color_rules.push(_clr)
    }
    color_rules.push("red");
    const _style = {
            'circle-radius': 2,
            'circle-fill-color': color_rules,
            'circle-stroke-color': 'gray',
            'circle-stroke-width': 0.5
    }
    return _style;
}

const repositoryStyle = makeColors(imlgsdb);
```

```js

async function getRecord(db, imlgsid) {
    if (!imlgsid) {
        return "";
    }
    const columns = [
        "imlgs",
        "igsn",
        "platform",
        "cruise",
        "sample",
        "device",
        "water_depth",
        "facility",
        "ship_code",
        "links",
        "intervals",
        "storage_meth",
        "cored_length",
        "cored_diam",
        "pi",
        "igsn",
        "province",
        "lake",
        "leg",
        "sample_comments"
    ];
    let query = `SELECT ${columns.join(',')} FROM imlgs WHERE imlgs=?`;
    const res = await db.queryRow(query, [imlgsid]);
    return JSON.stringify(res, null, 2); 
}

async function getRecordCount(db, where_clause, params) {
    //const columns = view(Inputs.table(await tableSummary(imlgsdb, "imlgs")));
    let query = "select count(*) as n from imlgs";
    if (where_clause !== "") {
        query = query + " WHERE " + where_clause;
    }
    console.log(query);
    setRecordCount("...");
    const res = await db.queryRow(query, params);
    setRecordCount(res.n);
}

async function loadParquetLayer(db, where_clause="", params=[]) {
    const psource = new VectorSource();
    let _where = " where geometry is not null";
    if (where_clause !== "") {
        _where = _where + where_clause_join + where_clause;
    }
    const query = `select imlgs, ST_AsWKB(geometry) as wkb, facility.facility_code as repository, platform, begin_jd from imlgs ${_where}`;
    console.log(query);
    const data = await db.query(query, params);
    const format = new WKB();
    let i = 0;
    for (const row of data) {
        const feature = format.readFeature(row.wkb, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });
        feature.setId(row.imlgs);
        feature.set("repository", row.repository, true);
        feature.set("beginjd", row.begin_jd, true);
        psource.addFeature(feature);
        i += 1;
    }
    console.log(`rows: ${i}`);
    const player = new WebGLVectorLayer({
        source: psource,
        style: repositoryStyle
    });
    return player;
}

let selected = null;

const where_clause = getWhereClause(the_inputs);
getRecordCount(imlgsdb, where_clause.clause, where_clause.params);

loadParquetLayer(imlgsdb, where_clause.clause, where_clause.params).then((pql) => {
    //global the_map_layer;
    if (map_data_layers.samples !== null) {
        console.log("remove layer")
        map.removeLayer(map_data_layers.samples);
        //map_data_layers.samples.dispose();
    }
    console.log("Add layer");
    map_data_layers.samples = pql;
    map.addLayer(map_data_layers.samples);
});

function selectStyle(feature) {
  const color = feature.get('COLOR') || '#eeeeee';
  selected.getFill().setColor(color);
  return selected;
}

const info = document.getElementById('infooverlay');
let currentFeature;
let res = "";
const displayFeatureInfo = function(pixel, target) {
  const feature = target.closest('.ol-control')
    ? undefined
    : map.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
      });
  if (feature) {
    info.style.left = pixel[0] + 'px';
    info.style.top = pixel[1] + 'px';
    if (feature !== currentFeature) {
      info.style.visibility = 'visible';
      res = feature.getId();
      info.innerText = `${feature.get('repository')} : ${res}`;
    }
  } else {
    info.style.visibility = 'hidden';
    res = "";
  }
  currentFeature = feature;
  return res;
}

map.on('pointermove', function (evt) {
  if (evt.dragging) {
    info.style.visibility = 'hidden';
    currentFeature = undefined;
    return;
  }
  displayFeatureInfo(evt.pixel, evt.originalEvent.target);
});

map.on('click', async function (evt) {
  console.log(`Click ${ evt.originalEvent.target}`);
  const imlgsid = displayFeatureInfo(evt.pixel, evt.originalEvent.target);
  setSelectedFeature("", "");
  const res = await getRecord(imlgsdb, imlgsid);
  setSelectedFeature(imlgsid, res);
});

map.getTargetElement().addEventListener('pointerleave', function () {
  currentFeature = undefined;
  info.style.visibility = 'hidden';
});

const _sel = getIdFromURL();
if (_sel) {
    const res = await getRecord(imlgsdb, _sel);
    setSelectedFeature(_sel, res);
}
```

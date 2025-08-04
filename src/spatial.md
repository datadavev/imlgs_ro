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
        height: 800px; 
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
import {
    IMLGSData, 
    getIdFromURL, 
    jdToDate,
    intervalComment
} from "./lib/common.js";

const pq_source = "https://s3.beehivebeach.com/imlgs/imlgs_full_2.parquet";
const imlgs_data = new IMLGSData(pq_source, "imlgs");
console.log("data initialize start")
await imlgs_data.initialize()
console.log("data initialize end")
```
<!-- Start of selection boxes -->
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
//let theRecords = getMatchingRecords(ui_inputs);
setRecordCount(getMatchingCount(ui_inputs));
```
<!-- End of selection boxes -->

<!-- The map container -->
<div id="olmap" class="map">
    <div id="infooverlay"></div>
</div>


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
    console.log("makeColors start")
    const results = await db.distinct("facility.facility_code");
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
        color_rules.push(["==",["get","repository"], row.d]);
        color_rules.push(_clr)
    }
    color_rules.push("red");
    const _style = {
            'circle-radius': 2,
            'circle-fill-color': color_rules,
            'circle-stroke-color': 'gray',
            'circle-stroke-width': 0.5
    }
    console.log("makeColors end")
    return _style;
}

const repositoryStyle = makeColors(imlgs_data);
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


async function loadParquetLayer(db, inputs) {
    const fields = [
        "imlgs", 
        "ST_AsWKB(geometry) as wkb", 
        "facility.facility_code as repository", 
        "platform", 
        "begin_jd"
    ];
    const where_clause = db.getWhereClause(inputs)
    //let _where = " where geometry is not null";
    //if (where_clause !== "") {
    //    _where = _where + where_clause_join + where_clause;
    //}
    //const query = `select imlgs, ST_AsWKB(geometry) as wkb, facility.facility_code as repository, platform, begin_jd from imlgs ${_where}`;
    //console.log(query);
    //const data = await db.ddb.query(query, params);
    const data = await db.select(fields, where_clause);
    const format = new WKB();
    let i = 0;
    const psource = new VectorSource();
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

const where_clause = null;
//getRecordCount(imlgsdb, where_clause.clause, where_clause.params);
loadParquetLayer(imlgs_data, ui_inputs).then((pql) => {
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
  //setSelectedFeature("", "");
  //const res = await getRecord(imlgsdb, imlgsid);
  //setSelectedFeature(imlgsid, res);
});

map.getTargetElement().addEventListener('pointerleave', function () {
  currentFeature = undefined;
  info.style.visibility = 'hidden';
});

//const _sel = getIdFromURL();
//if (_sel) {
    //const res = await getRecord(imlgsdb, _sel);
    //setSelectedFeature(_sel, res);
//}
```

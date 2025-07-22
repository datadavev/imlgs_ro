/**
 * Common JS used by different views
 */
import {DuckDBClient} from "npm:@observablehq/duckdb";
import * as Inputs from "npm:@observablehq/inputs";
import {Generators} from "observablehq:stdlib";

const DEFAULT_DISPLAY_FIELDS = [
    "imlgs",
    "platform",
    "device",
    "facility.facility_code as repository"
];

export const ui_inputs = [];

/**
 * Retrieve the fragment portion of the current URL.
 */
export function getIdFromURL() {
    const hash = window.location.hash;
    if (hash.length > 0) {
        return hash.slice(1);
    }
    return null;
}

/**
 * Holds an SQL WHERE clause and associated parameters.
 */
export class WhereClause {
    constructor(clause, params) {
        this.clause = clause;
        this.params = params;
    }
}

const NULL_WHERE_CLAUSE = new WhereClause("", []);

export async function addJSONLD(pid, jld_data) {
    const soeles = document.querySelectorAll("script[type='application/ld+json']");
    let soele = null;
    let create_new = true;
    if (soeles.length > 0) {
        soele = soeles[0];
        soele.setAttribute("id", pid);
        create_new = false;
    } else {
        soele = document.createElement("script");
        soele.type = "application/ld+json";
        soele.setAttribute("id", pid);
    }
    soele.text = JSON.stringify(jld_data, null, 2);
    console.log(soele.text);
    if (create_new) {
        document.querySelector("head").appendChild(soele);
    }
}


/**
 * Adds an observer to an input and yield a custom value, in this 
 * case, the input value and a template string associated with the input.
 * 
 * This is used to generate an SQL where clause for the input value
 * @param {*} inputer 
 * @param {*} template 
 * @returns 
 */
export function newInputObserver(inputer, template) {
    const res = Generators.observe((notify) => {
        const inputted = () => {
            notify({"v":inputer.value, "c": template});
        };
        inputted();
        inputer.addEventListener("input", inputted);
        return () => inputer.removeEventListener("input", inputted);
    });
    ui_inputs.push(res);
    return res;
}


export class Facet {
    constructor(name, field, options={}) {
        this.name = name;
        this.field = field;
        this.source = options.source || "imlgs";
        this.v = options.sel_value  || UNSELECTED;
        this._where = options.where || field;
        this.input = null;
    }

    get value() {
        if (this.input === null) {
            return this.v;
        }
        return this.input.value;
    }

    async values(facets) {
        const rows = await facets.valuesFor(this);
        const res = [UNSELECTED, ];
        for (const row of rows) {
            res.push(row.f);
        }
        return res;
    }

    /**
     * Return the value clause for this facet,
     *   SELECT ${facet.valueClause()} FROM source
     */
    valueClause(name="v") {
        return `${this.field} AS ${name}`;
    }

    /**
     * Return the FROM clause for this facet,
     *   SELECT value FROM ${facet.fromClause()}
     */
    fromClause() {
        return `${this.source}`
    }

    /** 
     * Return the where clause for this facet,
     *   SELECT value FROM source WHERE ${facet.whereClause()}
     */
    whereClause() {
        return `${this._where}=?`;
    }

    async initialize(facets) {
        const opts = {
            label: this.name,
            value: this.value
        };
        //if (this.value !== UNSELECTED) {
        //    opts.value = this.value;
        //}
        this.input = Inputs.select(await this.values(facets), opts)
    }
}


export class IMLGSData {
    constructor(data_source, data_view, display_fields, max_distinct) {
        this.data_source = data_source;
        this.data_view = data_view ? data_view : "imlgs";
        this.display_fields = display_fields ? display_fields : DEFAULT_DISPLAY_FIELDS;
        this.where_clause_join = " AND ";
        this.ddb = null;
        this.MAX_DISTINCT = max_distinct || 5000;
    }

    async initialize() {
        this.ddb = await DuckDBClient.of();
        await this.ddb.query(`create view ${this.data_view} as select * from read_parquet('${this.data_source}')`);
    }

    get db() {
        return this.ddb;
    }

    get tbl() {
        return this.data_view;
    }
    
    getWhereClause(inputs) {
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
                where_clause += ` WHERE ${clauses.join(this.where_clause_join)}`;
            }
        }
        console.log(`getWhereClause: ${where_clause}`);
        return new WhereClause(where_clause, params);
    }    

    async getColumns() {
        const q = `select column_name, column_type from (describe ${this.data_view})`;
        const result = await this.ddb.query(q);
        //return Array.from(result, (row) => [row.column_name, row.column_type]);
        return result;
    }

    async count(where_clause=null) {
        let query = `SELECT count(*) AS n FROM ${this.data_view}`;
        if (where_clause !== null) {
            query = query + where_clause.clause;
        }
        const result = await this.ddb.queryRow(query, where_clause.params);
        return result.n;
    }

    async countDistinct(column, where_clause=null) {
        let query = `SELECT count(distinct ${column}) AS n FROM ${this.data_view}`;
        if (where_clause !== null) {
            query = query + where_clause.clause;
        }
        const result = await this.ddb.queryRow(query, where_clause.params);
        return result.n;
    }

    async distinct(column, where_clause=null) {
        let query = `SELECT distinct ${column} AS d FROM ${this.data_view} order by d`;
        if (where_clause !== null) {
            query = query + where_clause.clause;
        }
        const result = await this.ddb.query(query, where_clause.params);
        return result;
    }

    async distinctCounts(column, where_clause=null) {
        let query = `SELECT ${column} AS d, count(*) AS n FROM ${this.data_view} `
        if (where_clause !== null) {
            query = query + where_clause.clause;
        }
        query += ` GROUP BY d ORDER BY d`;
        const result = await this.ddb.query(query, where_clause.params);
        return result;
    }

    async getDisplayRecords(where_clause) {
        let query = `SELECT ${this.display_fields.join(',')} FROM ${this.data_view}`;
        query = query + where_clause.clause;
        return this.ddb.query(query, where_clause.params);
    }

    /**
     * retrieve 
     * @param {*} pid 
     */
    async getRecord(pid) {
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
            "sample_comments",
            "ST_AsText(geometry) as geometry",
            "begin_jd"
        ];
        const query = `SELECT ${columns.join(',')} FROM imlgs WHERE imlgs=?`;
        const record = await this.ddb.queryRow(query, [pid]);
        return record;
    }

    recordToJSONLD(record) {
        const jld = {
            "@context": "https://schema.org/",
            "@type": "Thing",
            "isPartOf": window.location.origin,
            "identifier": [{
                "@type":"PropertyValue",
                "propertyID":"https://w3id.org/imlgs/sample",
                "value": record.sample
            }, {
                "@type":"PropertyValue",
                "propertyID":"https://w3id.org/imlgs/id",
                "value": record.imlgs
            }],
            "name": record.sample
        };
        if (record.igsn) {
            jld.identifier.push({
                "@type":"PropertyValue",
                "propertyID":"https://igsn.org/",
                "value": record.igsn
            });
        }
        return jld;
    }

    async newTextInput(column, label) {
        const datalist = [];
        const nvalues = await this.countDistinct(column, NULL_WHERE_CLAUSE);
        if (nvalues < this.MAX_DISTINCT) {
            const rows = await this.distinctCounts(column, NULL_WHERE_CLAUSE)
            for (const v of rows) {
                datalist.push(`${v.d} (${v.n})`);
            }
        }
        return Inputs.text({
            label: `${label} (${nvalues})`,
            submit: true,
            datalist: datalist,
            autocomplete:"off"
        }            
        );
    }

    async newSelectInput(column, label) {
        const nvalues = await this.countDistinct(column, NULL_WHERE_CLAUSE);
        const datalist = [['All', nvalues]];
        if (nvalues < this.MAX_DISTINCT) {
            const rows = await this.distinctCounts(column, NULL_WHERE_CLAUSE)
            for (const v of rows) {
                datalist.push([v.d, v.n]);
            }
        }
        return Inputs.select(datalist, {
            label: `${label} (${nvalues})`,
            multiple: false,
            submit: true,
            format: (v) => {return `${v[0]} (${v[1]})`},
            valueof: (v) => {
                if (v[0] === 'All') {
                    return ''
                };
                return v[0];
            }
            }            
        );
    }


    /**
     * Adds an observer to an input and yield a custom value, in this 
     * case, the input value and a template string associated with the input.
     * 
     * This is used to generate an SQL where clause for the input value
     * @param {*} inputer 
     * @param {*} template 
     * @returns 
     */
    async newInputObserver(column, label, template) {
        //const inputer = await this.newTextInput(column, label);
        const inputer = await this.newSelectInput(column, label);
        const res = Generators.observe((notify) => {
            const inputted = () => {
                notify({"v":inputer.value, "c": template});
            };
            inputted();
            inputer.addEventListener("input", inputted);
            return () => inputer.removeEventListener("input", inputted);
        });
        ui_inputs.push(res);
        return [inputer, res];
}
}


const d3 = require("d3");

const moment = require("moment")
const originalConsoleLog = console.log;

debug = false
export function interpolate(data, key, n) {
    n = Math.round(n)
    var n2 = Math.round(n / 2)
    n = n2 * 2
    var interpolatedData = []
    for (let i = (n / 2); i < (data.length - (n / 2)); i = i + (n / 2)) {


        var arr = []

        for (let b = i; b < i + (n / 2); b++) {

            arr.push(data[b][key])

        }
        if (arr.length == (n / 2)) {
            var avg = d3.mean(arr)

            interpolatedData.push({ x: data[i].seconds, y: avg })
        }




    }
    return interpolatedData
}
export function centroid(matrix) {

    var center = {
        x: d3.mean(matrix.map(e => e.x)), y: d3.mean(matrix.map(e => e.y)), z: d3.mean(matrix.map(e => e.z))
    }

    return center
}
export function unique(arr) {
    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
    return arr.filter(onlyUnique)
}



export function ratio(x, y) {
    var opt1 = round(100.0 * ((x / y) - 1.0))
    var opt2 = round(100.0 * (1.0 + (-1.0 * (y / x))))

    if (x > y) return opt1
    else return opt2
}
export function getEveryNth(arr, nth) {
    const result = [];
    nth = Math.floor(nth)
    if (nth == 0) nth = 1

    if (nth == 1) {
        return arr
    }
    else {
        for (let i = 0; i < arr.length; i += nth) {
            result.push(arr[i]);
        }

        return result;
    }


}

export function parseTime(str) {

    if (str.length == 13 || typeof str === "number") {
        return parseInt(str)
    }
    else {
        let format = "YYYY-MM-DD HH:mm:ss.SSS"
        let date = moment(str, format)
        let millis = date.valueOf()
        return millis
    }

}

export function parsePx(attribute) {
    if (attribute == null) {
        console.error("Attribute has not be set yet, cannot parse")
        return
    }
    // Parses an 'attr' from a D3 element: "500px" -> 500
    return parseInt(attribute.toString().replace("px", ""))
}

export function round(v) {
    return Math.round(v * 10000) / 10000
}
export function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
export function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}
export function uid() {
    var randomStrLength = Math.floor(Math.random() * 10) + 5,
        pool = 'abcdefghijklmnopqrstuvwxyz1234567890',
        randomStr = '';

    var pl = pool.length
    for (var i = 0; i < randomStrLength; i++) {
        var randomChar = pool.substr(Math.floor(Math.random() * pl), 1);
        randomStr += randomChar;
    }

    return "uid_" + randomStr;
}
export function debug(message) {
    if (debug == true) {
        console.log(message)
    }
}
export function log(message) {
    console.log(message)
}
export function formatDate(epoch) {
    const date = new Date(epoch);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    //return `${year}-${month}-${day} ${hours}:${minutes}`;
    return `${month}-${day}`;
}
export function disableLogging() {

    console.log = function () {
        // temporarily disable console logging, because this libary uses it too much
    };
}
export function enableLogging() {
    console.log = originalConsoleLog
}

export function saveCSV(rows, filename) {

    var stringOut = ""
    if (typeof rows == "string") {
        stringOut = rows
    }
    else {
        var keys = Object.keys(rows[0])

        keys.forEach(key => {
            stringOut += key + ","
        })
        stringOut += "\r\n"

        rows.forEach(row => {
            keys.forEach(key => {
                stringOut += row[key] + ","
            })
            stringOut += "\r\n"
        })



    }
    // create a Blob object from the string
    const blob = new Blob([stringOut], { type: "text/csv;charset=utf-8;" });

    // create a URL for the Blob object
    const url = URL.createObjectURL(blob);

    // create a link element to trigger the download
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename + ".csv");

    // trigger the download
    link.click();

}
/*global chrome*/

document.addEventListener('DOMContentLoaded', function() {
    //
    var link = document.querySelector("link[rel~='icon']");
    link.href = chrome.runtime.getURL("img/ex_logo.ico");

    var clb_button = document.getElementById('load_from_clip_id');
    clb_button.addEventListener('click', function() {
        paste();
    });

    var clb = document.getElementById('clear_table_id');
    clb.addEventListener('click', function() {
        $("#data_content_id").empty();
        chrome.storage.local.set({ "worklog_data": [] }, function() {
            console.log('Value is set to ', []);
        });
    });

    var impb = document.getElementById('import_worklog_id');
    impb.addEventListener('click', function() {
        createTimeSheet();
    });

    init();
});

async function init() {
    let worklogData = await loadWorklogFromCache();

    if (worklogData) {
        renderDataTale(worklogData);
    }

    // load thông tin account
    let userInf = await loadLoginUserFromCache();
    if (userInf) {
        document.getElementById("username").value = userInf.username;
        document.getElementById("passwordIp").value = userInf.passwordIp;

        let jiraType = "j3";
        if (userInf && userInf.jiraType) jiraType = userInf.jiraType;

        if (jiraType === 'j3') {
            document.getElementById("Jira3_id").checked = true;
        }

        if (jiraType === 'j9') {
            document.getElementById("Jira9_id").checked = true;
        }
    }
}

async function paste() {
    let worklogData = await loadWorklogFromCache();
    let index = 0;
    if (worklogData && worklogData.length > 0) {
        index = Math.max(...worklogData.map(o => o.data_k));
    }
    console.log(index);

    navigator.clipboard.readText()
        .then(text => {
            let array = text.split(/\r?\n/);

            array.forEach(element => {
                let lineItemList = element.split("\t");
                if (lineItemList.length < 6) return;
                let defaultTime = "00:00:00";

                worklogData = [{
                    issue: lineItemList[0],
                    date: moment(new Date(lineItemList[3])).format("YYYY-MM-DD"),
                    datetime: moment(new Date(lineItemList[3] + " " + defaultTime)).format("YYYY-MM-DDTHH:mm:ss.SSS"),
                    time: defaultTime,
                    worked: lineItemList[4],
                    remaining: "0",
                    desscription: lineItemList[1],
                    type: lineItemList[2],
                    status: "Wait",
                    data_k: ++index
                }, ...worklogData];
            });

            // Save config
            chrome.storage.local.set({ "worklog_data": worklogData }, function() {
                console.log('Value is set to ', worklogData);
            });

            renderDataTale(worklogData);
        })
        .catch(err => {
            console.error('Failed to read clipboard contents: ', err);
        });
}

function renderDataTale(worklogList) {
    $("#data_content_id").empty();
    let tmpl = $("#my-template").html();
    Mustache.parse(tmpl);

    worklogList.sort((a, b) => new Date(b.date) - new Date(a.date));
    worklogList.forEach((item) => {
        if (item.status === "OK") {
            item.colorcss = "#EFF5FB";
        } else if (item.status === "FALIL") {
            item.colorcss = "#F6D8CE";
        } else {
            item.colorcss = "#FFF";
        }

        if (!item.detailMsg) {
            item.detailMsg = " - ";
        }

        console.log(item)

        let rendered = Mustache.render(tmpl, item);
        $("#data_content_id").append(rendered);
    });
}

async function createTimeSheet() {

    let username = document.getElementById("username").value;
    let passwordIp = document.getElementById("passwordIp").value;
    let jiraType = document.querySelector('input[name="jira_type"]:checked').value;

    let userInf = {
        username: username,
        passwordIp: passwordIp,
        jiraType: jiraType
    }

    chrome.storage.local.set({ "login_inf": userInf }, function() {
        console.log('Value is set to ', "login_inf");
    });

    let dataList = await loadWorklogFromCache();
    if (!dataList || dataList.length === 0 || username === "") return;

    chrome.storage.local.set({ "worklog_status": "ready" }, function() {
        console.log('Value is set to ', "ready");
    });

    if (jiraType === 'j3') {
        window.location.href = "https://jiradomain/jira3";
    }

    if (jiraType === 'j9') {
        window.location.href = "https://jiradomain/jira9";
    }
}

async function loadWorklogFromCache() {
    let worklogData = [];
    let response = await new Promise((resolve, reject) => chrome.storage.local.get("worklog_data", function(res) {
        resolve(res);
    }));

    if (response && response.hasOwnProperty("worklog_data")) {
        worklogData = response.worklog_data;
    }

    return worklogData;
}

async function loadLoginUserFromCache() {
    let response = await new Promise((resolve, reject) => chrome.storage.local.get("login_inf", function(res) {
        resolve(res);
    }));

    let loginInf = null;
    if (response && response.hasOwnProperty("login_inf")) {
        loginInf = response.login_inf;
    }

    return loginInf;
}
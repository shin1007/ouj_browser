(function () {
  var webApiTenantUrl = "https://v.ouj.ac.jp/v1/tenants/" + tenantId;
  var loginUserXhr = createXhr();
  loginUserXhr.onreadystatechange = function() {
    if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
      var res = toJson(this.response);
      if (res !== null && res.userNo !== -2) {
      } else {
        var caa = location.href.match('(\\?|&)caa=([^&]*)');
        caa = (caa && caa.length > 0) ? caa[2] : null;
        if ((caa !== null) && (caa[caa.length - 1] !== "p")) {
          loginCas(location.href);
        }
      }
    }
  }
  loginUserXhr.open('GET', webApiTenantUrl + "/users/own", true);
  loginUserXhr.withCredentials = true;
  loginUserXhr.responseType = 'json'
  loginUserXhr.send();
  function toJson(response) {
    if (response == "" || response == null) return null;
    if (typeof(response) == "string") {
      return JSON.parse(response);
    } else {
      return response;
    }
  }
  function createXhr() {
    try {
        return new XMLHttpRequest();
    } catch (e) {
        try {
            return new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {
            return new ActiveXObject("Msxml2.XMLHTTP");
        }
    }
  }
  function loginCas(redirectUrl) {
    var url = webApiTenantUrl + "/login/cas?redirectUrl=";
    var search = "";
    var hash = "";
    if (isNullOrEmpty(redirectUrl)) {
        redirectUrl = location.href;
        search = location.search;
        hash = location.hash;
    }
    else {
        var parser = document.createElement("a");
        parser.href = redirectUrl;
        search = parser.search;
        hash = parser.hash;
    }
    if (!isNullOrEmpty(search)) {
        var query = search.substring(1);
        url += encodeURIComponent(redirectUrl.replace(search, "")) + "&" + query;
    }
    else {
        if (!isNullOrEmpty(hash) && hash.indexOf("?") >= 0) {
            redirectUrl = redirectUrl.replace("?", "&");
        }
        url += encodeURIComponent(redirectUrl);
    }
    location.href = url;
  }
  function isNullOrEmpty(value) {
    return (value == null || value === "");
  };
})();

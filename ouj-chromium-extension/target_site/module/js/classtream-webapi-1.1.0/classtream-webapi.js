var Classtream;
(function (Classtream) {
    var WebApiConfig = (function () {
        function WebApiConfig() {
        }
        WebApiConfig.API_URL = "https://v.ouj.ac.jp/v1";
        return WebApiConfig;
    }());
    Classtream.WebApiConfig = WebApiConfig;
})(Classtream || (Classtream = {}));
if (typeof jqCls === "undefined" && typeof $ !== "undefined") {
    jqCls = $;
}
if (typeof jqCls !== "undefined") {
    jqCls.support.cors = true;
}
var Classtream;
(function (Classtream) {
    var WebApi = (function () {
        function WebApi(options) {
            this.tenantId = 0;
            this.tenantUrl = null;
            this.isStartPolling = false;
            this.pollingRetryCount = 0;
            this.bearerToken_ = null;
            this.isBearerAuth_ = null;
            this.noCache = null;
            this.isCasLogin_ = false;
            this.isGuest_ = false;
            var self = this;
            Classtream.WebApi.logger = new Classtream.Logger("Classtream.WebApi");
            this.isBearerAuth_ = Common.isBearerAuth();
            if (options != null) {
                if (options["tenantId"] != null) {
                    this.tenantId = +options["tenantId"];
                    if (!Common.isNumber(this.tenantId)) {
                        throw "Invalid tenantId. [tenantId=" + this.tenantId + "]";
                    }
                }
                this.noCache = options["noCache"];
            }
            var value = Common.sessionStorage.getItem(Classtream.WebApi.SS_KEY_IS_CAS_LOGIN(this.tenantId));
            if (value === "true") {
                this.isCasLogin_ = true;
            }
            Common.sessionStorage.setItem(Classtream.WebApi.SS_KEY_IS_CAS_LOGIN(this.tenantId), String(this.isCasLogin_));
            var value = Common.sessionStorage.getItem(Classtream.WebApi.SS_KEY_IS_GUEST(this.tenantId));
            if (value === "true") {
                this.isGuest_ = true;
            }
            Common.sessionStorage.setItem(Classtream.WebApi.SS_KEY_IS_GUEST(this.tenantId), String(this.isCasLogin_));
            this.tenantUrl = WebApi.makeTenantUrl(this.tenantId);
            WebApi.setCrossDomain(true);
            if (self.isBearerAuth_) {
                this.bearerToken_ = Common.localStorage.getItem(WebApi.LS_KEY_BEARER_TOKEN(this.tenantId));
            }
            jqCls.ajaxSetup({
                beforeSend: function (xhr) {
                    if (self.isBearerAuth_) {
                        var token = self.bearerToken_;
                        xhr.setRequestHeader("Authorization", 'Bearer ' + token);
                    }
                }
            });
            jqCls.ajaxTransport("+binary", function (options, originalOptions, jqXHR) {
                if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob))))) {
                    return {
                        send: function (headers, callback) {
                            var xhr = new XMLHttpRequest(), url = options.url, type = options.type, async = options.async || true, dataType = options.responseType || "blob", data = options.data || null, username = options.username || null, password = options.password || null;
                            xhr.withCredentials = true;
                            xhr.addEventListener('load', function () {
                                var data = {};
                                data[options.dataType] = xhr.response;
                                callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                            });
                            xhr.addEventListener('error', function () {
                                var data = {};
                                data[options.dataType] = xhr.response;
                                callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                            });
                            xhr.open(type, url, async, username, password);
                            for (var i in headers) {
                                xhr.setRequestHeader(i, headers[i]);
                            }
                            xhr.responseType = dataType;
                            xhr.send(data);
                        },
                        abort: function () { }
                    };
                }
            });
        }
        WebApi.SS_KEY_IS_CAS_LOGIN = function (tenantId) { return "ClasstreamIsCasLogin_" + tenantId; };
        WebApi.SS_KEY_IS_GUEST = function (tenantId) { return "ClasstreamIsGuest_" + tenantId; };
        WebApi.LS_KEY_BEARER_TOKEN = function (tenantId) { return "ClasstreamBearerToken_" + tenantId; };
        Object.defineProperty(WebApi.prototype, "isCasLogin", {
            get: function () { return this.isCasLogin_; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WebApi.prototype, "isGuest", {
            get: function () { return this.isGuest_; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WebApi.prototype, "isBearerAuth", {
            get: function () { return this.isBearerAuth_; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WebApi.prototype, "bearerToken", {
            get: function () { return this.bearerToken_; },
            enumerable: true,
            configurable: true
        });
        WebApi.isVod = function (content) {
            return WebApi.isContentType(content, WebApi.Model.ContentType.V);
        };
        WebApi.isLive = function (content) {
            return WebApi.isContentType(content, WebApi.Model.ContentType.L);
        };
        WebApi.isContentType = function (content, type) {
            if (Classtream.Common.isNullOrEmpty(content))
                return false;
            var contentType = null;
            if (typeof content === "string") {
                contentType = content;
            }
            else {
                contentType = content.contentType;
            }
            return (WebApi.Model.ContentType[contentType] == type);
        };
        WebApi.prototype.setTenantId = function (tenantId) {
            this.tenantId = tenantId;
            this.tenantUrl = WebApi.makeTenantUrl(tenantId);
            return this;
        };
        WebApi.prototype.getTenantId = function () {
            return this.tenantId;
        };
        WebApi.setCrossDomain = function (crossDomain) {
            if (crossDomain) {
                jqCls.ajaxSetup({
                    crossDomain: true,
                    xhrFields: {
                        withCredentials: true
                    }
                });
            }
            else {
                jqCls.ajaxSetup({
                    crossDomain: null,
                    xhrFields: null
                });
            }
        };
        WebApi.makeTenantUrl = function (tenantId) {
            return WebApi.API_URL + "/tenants/" + tenantId;
        };
        WebApi.prototype.getTenantUrl = function () {
            return this.tenantUrl;
        };
        WebApi.prototype.getContentUrl = function (contentType, contentId) {
            if (contentType == WebApi.Model.ContentType.V) {
                return this.tenantUrl + "/vod-contents/" + contentId;
            }
            else if (contentType == WebApi.Model.ContentType.L) {
                return this.tenantUrl + "/live-contents/" + contentId;
            }
            else {
                throw "contentType is none.";
            }
        };
        WebApi.prototype.getVodContentUrl = function (contentId) {
            return this.getContentUrl(WebApi.Model.ContentType.V, contentId);
        };
        WebApi.prototype.getLiveContentUrl = function (contentId) {
            return this.getContentUrl(WebApi.Model.ContentType.L, contentId);
        };
        WebApi.prototype.getContentUrlForAuthTicket = function (contentType) {
            if (contentType == WebApi.Model.ContentType.V) {
                return WebApi.API_URL + "/auth-ticket/vod-";
            }
            else if (contentType == WebApi.Model.ContentType.L) {
                return WebApi.API_URL + "/auth-ticket/live-";
            }
            else {
                throw "contentType is none.";
            }
        };
        WebApi.prototype.on = function (eventType, callback) {
            jqCls(this).on(eventType, callback);
            return this;
        };
        WebApi.prototype.off = function (eventType, callback) {
            jqCls(this).off(eventType, callback);
            return this;
        };
        WebApi.prototype.trigger = function (eventType, extraParameters) {
            jqCls(this).trigger(eventType, extraParameters);
            return this;
        };
        WebApi.prototype.onDone = function (callback) {
            return this.on(WebApi.TRIGGER_DONE, callback);
        };
        WebApi.prototype.onFail = function (callback) {
            return this.on(WebApi.TRIGGER_FAIL, callback);
        };
        WebApi.prototype.onFail401WithoutLoginLogout = function (callback) {
            return this.on(WebApi.TRIGGER_FAIL_401_WITHOUT_LOGIN_LOGOUT, callback);
        };
        WebApi.prototype.offDone = function (callback) {
            return this.off(WebApi.TRIGGER_DONE, callback);
        };
        WebApi.prototype.offFail = function (callback) {
            return this.off(WebApi.TRIGGER_FAIL, callback);
        };
        WebApi.prototype.offFail401WithoutLoginLogout = function (callback) {
            return this.off(WebApi.TRIGGER_FAIL_401_WITHOUT_LOGIN_LOGOUT, callback);
        };
        WebApi.prototype.triggerDone = function (url, data, textStatus, jqXHR, requestType, message) {
            var httpStatus = (jqXHR) ? jqXHR.status : null;
            if (requestType == WebApi.Model.RequestType.GetLoginUser && httpStatus == 204) {
            }
            else {
                this.startSessionCheck();
            }
            if (message == null)
                message = textStatus;
            var httpStatus = (jqXHR) ? jqXHR.status : null;
            Classtream.WebApi.logger.log([url, httpStatus, message, jqXHR, data, WebApi.Model.RequestType[requestType]]);
            jqCls(this).trigger(WebApi.TRIGGER_DONE, [url, httpStatus, message, jqXHR, data, requestType]);
        };
        WebApi.prototype.triggerFail = function (url, jqXHR, textStatus, errorThrown, requestType, message) {
            if (message == null)
                message = errorThrown;
            var httpStatus = (jqXHR) ? jqXHR.status : null;
            Classtream.WebApi.logger.log([url, httpStatus, message, jqXHR, WebApi.Model.RequestType[requestType]]);
            if (httpStatus == 401 || httpStatus >= 500) {
                this.stopSessionCheck();
            }
            jqCls(this).trigger(WebApi.TRIGGER_FAIL, [url, httpStatus, message, jqXHR, requestType]);
            if (httpStatus == 401 && requestType != WebApi.Model.RequestType.Login && requestType != WebApi.Model.RequestType.Logout) {
                if (this.isBearerAuth) {
                    Common.localStorage.removeItem(WebApi.LS_KEY_BEARER_TOKEN(this.tenantId));
                }
                jqCls(this).trigger(WebApi.TRIGGER_FAIL_401_WITHOUT_LOGIN_LOGOUT, [url, httpStatus, message, jqXHR, requestType]);
            }
        };
        WebApi.prototype.login = function (userId, password) {
            var self = this;
            var url = this.getTenantUrl() + "/login";
            if (this.isBearerAuth) {
                var query = Url.Query.join(query, "ba", true);
                url = Url.joinQuery2(url, query);
            }
            var ret = this.jqClsPost(url, {
                userId: userId,
                password: password
            }, WebApi.Model.RequestType.Login).then(function (data, textStatus, jqXHR) {
                self.loginCommon.bind(self)(data, textStatus, jqXHR);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
            this.initLogin(false, false);
            return ret;
        };
        WebApi.prototype.loginGuest = function () {
            var self = this;
            var url = this.getTenantUrl() + "/login/guest";
            if (this.isBearerAuth) {
                var query = Url.Query.join(query, "ba", true);
                url = Url.joinQuery2(url, query);
            }
            var ret = this.jqClsPost(url, null, WebApi.Model.RequestType.Login).then(function (data, textStatus, jqXHR) {
                self.loginCommon.bind(self)(data, textStatus, jqXHR);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
            this.initLogin(true, false);
            return ret;
        };
        WebApi.prototype.loginCommon = function (data, textStatus, jqXHR) {
            var httpStatus = (jqXHR) ? jqXHR.status : null;
            if (httpStatus == 200) {
                this.bearerToken_ = data.bearerToken;
                if (!Common.isNullOrEmpty(this.bearerToken_)) {
                    Common.localStorage.setItem(WebApi.LS_KEY_BEARER_TOKEN(this.tenantId), this.bearerToken_);
                }
            }
        };
        WebApi.prototype.loginGuestForMobileApp = function () {
            var self = this;
            this.initLogin(true, false);
            var url = this.getTenantUrl() + "/login/guest/mobile-app";
            location.href = url;
        };
        WebApi.prototype.loginCas = function (redirectUrl) {
            this.initLogin(false, true);
            var url = this.getTenantUrl() + "/login/cas?redirectUrl=";
            var redirectUrlObj = location;
            var search = "";
            var hash = "";
            if (Common.isNullOrEmpty(redirectUrl)) {
                redirectUrl = location.href;
                search = location.search;
                hash = location.hash;
            }
            else {
                var parser = document.createElement('a');
                parser.href = redirectUrl;
                search = parser.search;
                hash = parser.hash;
            }
            if (!Common.isNullOrEmpty(search)) {
                var query = search.substring(1);
                url += encodeURIComponent(redirectUrl.replace(search, "")) + "&" + query;
            }
            else {
                if (!Common.isNullOrEmpty(hash) && hash.indexOf("?") >= 0) {
                    redirectUrl = redirectUrl.replace("?", "&");
                }
                url += encodeURIComponent(redirectUrl);
            }
            location.href = url;
        };
        WebApi.prototype.loginCasForMobileApp = function () {
            this.initLogin(false, true);
            var url = this.getTenantUrl() + "/login/cas/mobile-app";
            location.href = url;
        };
        WebApi.prototype.authOneTimeTicket = function (oneTimeTicket) {
            var self = this;
            this.initLogin(false, false);
            var url = this.getTenantUrl() + "/login/one-time-ticket";
            return this.jqClsPost(url, { oneTimeTicket: oneTimeTicket });
        };
        WebApi.prototype.logout = function (async) {
            var self = this;
            var url = this.getTenantUrl() + "/logout";
            var ret = this.jqClsAjax({
                type: "POST",
                async: async,
                scriptCharset: "utf-8",
                timeout: 10000,
                url: url,
                data: null
            }, WebApi.Model.RequestType.Logout);
            this.initLogin(false, false);
            return ret;
        };
        WebApi.prototype.logoutForMobileApp = function () {
            var self = this;
            this.initLogin(false, false);
            var url = this.getTenantUrl() + "/logout/mobile-app";
            location.href = url;
        };
        WebApi.prototype.logoutCas = function () {
            var self = this;
            this.initLogin(false, false);
            var url = this.getTenantUrl() + "/logout/cas";
            location.href = url;
        };
        WebApi.prototype.logoutCasForMobileApp = function () {
            var self = this;
            this.initLogin(false, false);
            var url = this.getTenantUrl() + "/logout/cas/mobile-app";
            location.href = url;
        };
        WebApi.prototype.redirectMaintenancePage = function () {
            var url = this.getTenantUrl() + "/page/maintenance";
            location.href = url;
        };
        WebApi.prototype.redirectTooManyConnectionPage = function () {
            var url = this.getTenantUrl() + "/page/too-many-connection";
            location.href = url;
        };
        WebApi.prototype.initLogin = function (isGuest, isCasLogin) {
            this.bearerToken_ = null;
            this.isGuest_ = isGuest;
            this.isCasLogin_ = isCasLogin;
            if (this.isBearerAuth) {
                Common.localStorage.removeItem(WebApi.LS_KEY_BEARER_TOKEN(this.tenantId));
            }
            Common.sessionStorage.setItem(Classtream.WebApi.SS_KEY_IS_GUEST(this.tenantId), String(isGuest));
            Common.sessionStorage.setItem(Classtream.WebApi.SS_KEY_IS_CAS_LOGIN(this.tenantId), String(isCasLogin));
        };
        WebApi.prototype.getLoginUser = function () {
            var url = this.getTenantUrl() + "/users/own";
            return this.jqClsGet(url, WebApi.Model.RequestType.GetLoginUser);
        };
        WebApi.prototype.changePassword = function (password, newPassword) {
            var url = this.getTenantUrl() + "/users/own/password";
            return this.jqClsPost(url, {
                password: password,
                newPassword: newPassword
            });
        };
        WebApi.prototype.changePasswordForAdmin = function (userId, newPassword) {
            var url = this.getTenantUrl() + "/users/" + userId + "/password";
            return this.jqClsPost(url, {
                newPassword: newPassword
            });
        };
        WebApi.prototype.getUsers = function () {
            var url = this.getTenantUrl() + "/users";
            return this.jqClsGet(url);
        };
        WebApi.prototype.registerUsers = function (parentUserId, num, password) {
            var url = this.getTenantUrl() + "/users/mass";
            return this.jqClsPost(url, {
                parentUserId: parentUserId,
                num: num,
                password: password
            });
        };
        WebApi.prototype.updateUser = function (userId, user) {
            var url = this.getTenantUrl() + "/users/" + userId;
            return this.jqClsPost(url, user);
        };
        WebApi.prototype.deleteUser = function (userId) {
            var url = this.getTenantUrl() + "/users/" + userId;
            return this.jqClsDelete(url);
        };
        WebApi.prototype.getTenant = function () {
            var url = this.getTenantUrl();
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data != null) {
                    if (data.pickupCount != null)
                        data.pickUpCount = data.pickupCount;
                    if (data.enableGroup != null)
                        data.validGroup = data.enableGroup;
                    if (data.enableCategory != null)
                        data.validCategory = data.enableCategory;
                    if (data.enablePoint != null)
                        data.validPoint = data.enablePoint;
                    if (data.enablePaypal != null)
                        data.validPaypal = data.enablePaypal;
                    if (data.paypalContactMessage != null)
                        data.contactMessage = data.paypalContactMessage;
                    if (data.enableUserRank != null)
                        data.validUserRank = data.enableUserRank;
                    if (data.enableComment != null)
                        data.validComment = data.enableComment;
                    if (data.enableViewCount != null)
                        data.validViewCount = data.enableViewCount;
                    if (data.enableReview != null)
                        data.validReview = data.enableReview;
                    if (data.requiredReview != null)
                        data.requiredReviewInput = data.requiredReview;
                    if (data.enableViewStatus != null)
                        data.validViewStatus = data.enableViewStatus;
                    if (data.enableX2Transcode != null)
                        data.validTranscode = data.enableX2Transcode;
                    if (data.enableGuestLogin != null)
                        data.validGuestLogin = data.enableGuestLogin;
                    if (data.enableWatermark != null)
                        data.validContentWaterMark = data.enableWatermark;
                    if (data.contentWatermarkFontSize != null)
                        data.contentWaterMarkFontSize = data.contentWatermarkFontSize;
                    if (data.contentWatermarkAlpha != null)
                        data.contentWaterMarkAlpha = data.contentWatermarkAlpha;
                    if (data.contentWatermarkFontColor != null)
                        data.contentWaterMarkFontColor = data.contentWatermarkFontColor;
                    if (data.contentWatermarkOutlineColor != null)
                        data.contentWaterMarkOutlineColor = data.contentWatermarkOutlineColor;
                    if (data.contentWatermarkPattern != null)
                        data.contentWaterMarkPattern = data.contentWatermarkPattern;
                    if (data.enableEncryptedContentWatermark != null)
                        data.enableEncryptedContentWaterMark = data.enableEncryptedContentWatermark;
                    if (data.enableContentWatermark != null)
                        data.enableContentWaterMark = data.enableContentWatermark;
                    if (data.contentWatermarkTarget != null)
                        data.contentWaterMarkTarget = data.contentWatermarkTarget;
                }
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.updateTenant = function (tenant) {
            var url = this.getTenantUrl();
            return this.jqClsPost(url, tenant);
        };
        WebApi.prototype.getUseFileSize = function () {
            var url = this.getTenantUrl() + "/use-file-size";
            return this.jqClsGet(url);
        };
        WebApi.prototype.getFunctions = function () {
            var url = this.getTenantUrl() + "/functions";
            return this.jqClsGet(url);
        };
        WebApi.prototype.updateFunctions = function (addFunctions, removeFunctions) {
            var url = this.getTenantUrl() + "/functions";
            return this.jqClsPost(url, { addFunctions: addFunctions,
                removeFunctions: removeFunctions
            });
        };
        WebApi.prototype.getGroups = function () {
            var url = this.getTenantUrl() + "/groups";
            return this.jqClsGet(url);
            ;
        };
        WebApi.prototype.registerGroup = function (name) {
            var url = this.getTenantUrl() + "/groups";
            return this.jqClsPost(url, {
                name: name
            });
        };
        WebApi.prototype.updateGroup = function (groupId, name) {
            var url = this.getTenantUrl() + "/groups/" + groupId;
            return this.jqClsPost(url, {
                name: name
            });
        };
        WebApi.prototype.deleteGroup = function (groupId) {
            var url = this.getTenantUrl() + "/groups/" + groupId;
            return this.jqClsDelete(url);
        };
        WebApi.prototype.getVodVideoSrc = function (contentId, hls, paypalKey, region) {
            var self = this;
            var url = this.getContentUrl(WebApi.Model.ContentType.V, contentId) + "/video-src";
            var query = "";
            query = Url.Query.join(query, "hls", hls);
            query = Url.Query.join(query, "region", region);
            query = Url.Query.join(query, "paypalKey", paypalKey);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                self.keepCompatibilityVideoSrcWatermark(data);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.keepCompatibilityVideoSrcWatermark = function (data) {
            if (data != null && data.watermark != null) {
                var watermark = data.watermark;
                if (watermark.fontSize != null)
                    watermark.waterMarkFontSize = watermark.fontSize;
                if (watermark.alpha != null)
                    watermark.waterMarkAlpha = watermark.alpha;
                if (watermark.fontColor != null)
                    watermark.waterMarkFontColor = watermark.fontColor;
                if (watermark.outlineColor != null)
                    watermark.waterMarkOutlineColor = watermark.outlineColor;
                if (watermark.pattern != null)
                    watermark.waterMarkPattern = watermark.pattern;
                if (watermark.target != null)
                    watermark.waterMarkTarget = watermark.target;
            }
        };
        WebApi.prototype.getVodVideoSrcV3 = function (contentId, region) {
            var url = this.getContentUrl(WebApi.Model.ContentType.V, contentId) + "/video-src/v3";
            var query = "";
            query = Url.Query.join(query, "region", region);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getLiveVideoSrc = function (contentId, hls, paypalKey, region) {
            var self = this;
            var url = this.getContentUrl(WebApi.Model.ContentType.L, contentId) + "/video-src";
            var query = "";
            query = Url.Query.join(query, "hls", hls);
            query = Url.Query.join(query, "region", region);
            query = Url.Query.join(query, "paypalKey", paypalKey);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                self.keepCompatibilityVideoSrcWatermark(data);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getLiveVideoSrcV3 = function (contentId, region) {
            var url = this.getContentUrl(WebApi.Model.ContentType.L, contentId) + "/video-src/v3";
            var query = "";
            query = Url.Query.join(query, "region", region);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getLiveVideoSrcWebRTC = function (contentId, region) {
            var self = this;
            var url = this.getContentUrl(WebApi.Model.ContentType.L, contentId) + "/video-src-webrtc";
            var query = "";
            query = Url.Query.join(query, "region", region);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                self.keepCompatibilityVideoSrcWatermark(data);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.registerViewingLog = function (contentType, contentId, region, paypalKey, currentTimeRate) {
            if (paypalKey === void 0) { paypalKey = null; }
            if (currentTimeRate === void 0) { currentTimeRate = null; }
            var url = this.getContentUrl(contentType, contentId) + "/viewinglog";
            var query = Url.Query.join(query, "region", region);
            query = Url.Query.join(query, "paypalKey", paypalKey);
            query = Url.Query.join(query, "currentTimeRate", currentTimeRate);
            url = Url.joinQuery2(url, query);
            return this.jqClsPost(url, null);
        };
        WebApi.prototype.updateViewingLogEndDate = function (contentType, contentId, viewId, currentTimeRate, async) {
            if (viewId == null)
                return;
            var url = this.getContentUrl(contentType, contentId) + "/viewinglog/" + viewId + "/end-date";
            return this.updateViewingLogEndDateBase(url, {
                currentTimeRate: currentTimeRate
            }, async);
        };
        WebApi.prototype.updateViewingLogEndDateBase = function (url, data, async, message) {
            if (message === void 0) { message = null; }
            var self = this;
            var result = this.jqClsAjax({
                type: "POST",
                async: async,
                scriptCharset: "utf-8",
                timeout: 10000,
                url: url,
                data: data
            });
            if (!async) {
                WebApi.setCrossDomain(true);
            }
            return result;
        };
        WebApi.prototype.getVodContentLatestViewingLog = function (contentId) {
            var url = this.getContentUrl(WebApi.Model.ContentType.V, contentId) + "/viewinglog/latest";
            return this.jqClsGet(url);
        };
        WebApi.prototype.getLiveContentLatestViewingLog = function (contentId) {
            var url = this.getContentUrl(WebApi.Model.ContentType.L, contentId) + "/viewinglog/latest";
            return this.jqClsGet(url);
        };
        WebApi.prototype.getLatestViewingLog = function (contentType, contentId) {
            var url = this.getContentUrl(contentType, contentId) + "/viewinglog/latest";
            return this.jqClsGet(url);
        };
        WebApi.prototype.getViewingLogs = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getTenantUrl() + "/viewinglogs";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            query = Url.Query.join(query, "contentType", searchOptions["contentType"]);
            query = Url.Query.join(query, "offset", searchOptions["offset"]);
            query = Url.Query.join(query, "limit", searchOptions["limit"]);
            query = Url.Query.join(query, "sortType", searchOptions["sortType"]);
            query = Url.Query.join(query, "groupId", searchOptions["groupId"]);
            query = Url.Query.join(query, "userIds", searchOptions["userIds"]);
            var searchStartDate = searchOptions["searchStartDate"];
            if (searchStartDate != null && Object.prototype.toString.call(searchStartDate) == "[object Date]") {
                searchStartDate = Common.dateToUTSString(searchStartDate);
            }
            var searchEndDate = searchOptions["searchEndDate"];
            if (searchEndDate != null && Object.prototype.toString.call(searchEndDate) == "[object Date]") {
                searchEndDate = Common.dateToUTSString(searchEndDate);
            }
            query = Url.Query.join(query, "searchStartDate", searchStartDate, true);
            query = Url.Query.join(query, "searchEndDate", searchEndDate, true);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getViewingLogsCount = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getTenantUrl() + "/viewinglogs/count";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            query = Url.Query.join(query, "contentType", searchOptions["contentType"]);
            query = Url.Query.join(query, "groupId", searchOptions["groupId"]);
            query = Url.Query.join(query, "userIds", searchOptions["userIds"]);
            var searchStartDate = searchOptions["searchStartDate"];
            if (searchStartDate != null && Object.prototype.toString.call(searchStartDate) == "[object Date]") {
                searchStartDate = Common.dateToUTSString(searchStartDate);
            }
            var searchEndDate = searchOptions["searchEndDate"];
            if (searchEndDate != null && Object.prototype.toString.call(searchEndDate) == "[object Date]") {
                searchEndDate = Common.dateToUTSString(searchEndDate);
            }
            query = Url.Query.join(query, "searchStartDate", searchStartDate, true);
            query = Url.Query.join(query, "searchEndDate", searchEndDate, true);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.updateVodContentUserReview = function (contentId, userReview) {
            var url = this.getContentUrl(WebApi.Model.ContentType.V, contentId) + "/user-review";
            return this.jqClsPost(url, {
                userReview: userReview
            });
        };
        WebApi.prototype.getVodContentUserReview = function (contentId) {
            var url = this.getContentUrl(WebApi.Model.ContentType.V, contentId) + "/user-review";
            return this.jqClsGet(url);
        };
        WebApi.prototype.getThumbnailUrl = function (contentType, contentId, size) {
            var sizeStr = null;
            switch (size) {
                case WebApi.Model.ThumbnailSize.Large2:
                    sizeStr = "large2";
                    break;
                case WebApi.Model.ThumbnailSize.Large:
                    sizeStr = "large";
                    break;
                case WebApi.Model.ThumbnailSize.Middle:
                    sizeStr = "middle";
                    break;
                case WebApi.Model.ThumbnailSize.Small:
                    sizeStr = "small";
                    break;
                default:
                    sizeStr = "small";
            }
            var url = this.getContentUrl(contentType, contentId) + "/thumbnail/" + sizeStr;
            var query = Url.Query.join(query, "noCache", this.noCache);
            if (this.isBearerAuth) {
                query = Url.Query.join(query, "bt", this.bearerToken_);
            }
            return Url.joinQuery2(url, query);
        };
        WebApi.prototype.getBlobUrl = function (url) {
            var query = Url.Query.join(query, "blob", "true");
            url = Url.joinQuery2(url, query);
            return this.jqClsAjax({
                url: url,
                type: 'GET',
                dataType: 'binary',
                responseType: 'blob',
                processData: false
            }).then(function (data, textStatus, jqXHR) {
                var blobUrl = (window.URL || window.webkitURL).createObjectURL(data);
                return jqCls.Deferred().resolve(blobUrl, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getVodThumbnailUrl = function (contentId, size) {
            return this.getThumbnailUrl(WebApi.Model.ContentType.V, contentId, size);
        };
        WebApi.prototype.getLiveThumbnailUrl = function (contentId, size) {
            return this.getThumbnailUrl(WebApi.Model.ContentType.L, contentId, size);
        };
        WebApi.prototype.getMaterialUrl = function (contentType, contentId) {
            var url = this.getContentUrl(contentType, contentId) + "/material";
            var query = null;
            if (this.isBearerAuth) {
                query = Url.Query.join(query, "bt", this.bearerToken_);
            }
            return Url.joinQuery2(url, query);
        };
        WebApi.prototype.getM3U8Src = function (src) {
            WebApi.setCrossDomain(false);
            var result = this.jqClsGet(src);
            WebApi.setCrossDomain(true);
            return result;
        };
        WebApi.prototype.getContentByAccessKey = function (accessKey) {
            if (Common.isNullOrEmpty(accessKey))
                throw "accessKey is empty.";
            var self = this;
            var url = this.getTenantUrl() + "/contents/access-key/" + accessKey;
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (Common.isNullOrEmpty(data))
                    return;
                var content = data;
                self.appendContetnInfo(WebApi.Model.ContentType[content.contentType], content);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getContentByPayPalKey = function (paypalKey) {
            if (Common.isNullOrEmpty(paypalKey))
                throw "paypalKey is empty.";
            var self = this;
            var url = this.getTenantUrl() + "/contents/paypal-key/" + paypalKey;
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (Common.isNullOrEmpty(data))
                    return;
                var content = data.content;
                self.appendContetnInfo(WebApi.Model.ContentType[content.contentType], content);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.deleteVodContent = function (contentId) {
            var self = this;
            var url = this.getVodContentUrl(contentId);
            var result = this.jqClsDelete(url);
            return result;
        };
        WebApi.prototype.getVodContent = function (contentId, options) {
            if (options === void 0) { options = null; }
            var self = this;
            var url = this.getVodContentUrl(contentId);
            if (options == null)
                options = {};
            var query = "";
            query = Url.Query.join(query, "addDirectAccessUrl", options["addDirectAccessUrl"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data == null)
                    return;
                var content = data;
                self.appendContetnInfo(WebApi.Model.ContentType.V, content);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getVodContents = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getTenantUrl() + "/vod-contents";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            var sortOrderStr = null;
            if (Common.isNumber(searchOptions["sortOrder"])) {
                sortOrderStr = WebApi.Model.SortOrder[searchOptions["sortOrder"]];
            }
            else {
                sortOrderStr = searchOptions["sortOrder"];
            }
            var searchQuery = searchOptions["searchQuery"];
            if (!Common.isNullOrEmpty(searchQuery)) {
                query = Url.Query.join(query, "q", encodeURIComponent(searchQuery));
            }
            query = Url.Query.join(query, "qt", searchOptions["searchTarget"]);
            query = Url.Query.join(query, "categoryId", searchOptions["categoryId"]);
            var categoryAlias = searchOptions["categoryAlias"];
            if (!Common.isNullOrEmpty(categoryAlias)) {
                query = Url.Query.join(query, "categoryAlias", encodeURIComponent(categoryAlias));
            }
            query = Url.Query.join(query, "addDirectAccessUrl", searchOptions["addDirectAccessUrl"]);
            query = Url.Query.join(query, "recursive", searchOptions["recursive"]);
            query = Url.Query.join(query, "offset", searchOptions["offset"]);
            query = Url.Query.join(query, "limit", searchOptions["limit"]);
            query = Url.Query.join(query, "sortType", searchOptions["sortType"]);
            query = Url.Query.join(query, "sortOrder", sortOrderStr);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data == null)
                    return;
                var contents = data;
                for (var i = 0; i < contents.length; i++) {
                    var content = contents[i];
                    self.appendContetnInfo(WebApi.Model.ContentType.V, content);
                }
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getVodContentsCount = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var url = this.getTenantUrl() + "/vod-contents/count";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            var searchQuery = searchOptions["searchQuery"];
            if (!Common.isNullOrEmpty(searchQuery)) {
                query = Url.Query.join(query, "q", encodeURIComponent(searchQuery));
            }
            query = Url.Query.join(query, "qt", searchOptions["searchTarget"]);
            query = Url.Query.join(query, "categoryId", searchOptions["categoryId"]);
            var categoryAlias = searchOptions["categoryAlias"];
            if (!Common.isNullOrEmpty(categoryAlias)) {
                query = Url.Query.join(query, "categoryAlias", encodeURIComponent(categoryAlias));
            }
            query = Url.Query.join(query, "recursive", searchOptions["recursive"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodContentsByAlias = function (categoryAlias, contentAlias) {
            return this.getVodContents({ categoryAlias: categoryAlias, searchTarget: WebApi.Model.SearchTarget.Alias, searchQuery: contentAlias });
        };
        WebApi.prototype.registerVodContent = function (content) {
            var url = this.getTenantUrl() + "/vod-contents";
            return this.jqClsPost(url, content);
        };
        WebApi.prototype.updateVodContent = function (contentId, content) {
            var url = this.getTenantUrl() + "/vod-contents/" + contentId;
            return this.jqClsPost(url, content);
        };
        WebApi.prototype.getVodFileUploadInfo = function (contentId) {
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/upload-info";
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodFileDownloadInfo = function (contentId) {
            var kind = 1;
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/download-info/" + kind;
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodDirectUrl = function (contentId) {
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/direct-url";
            var query = "";
            query = Url.Query.join(query, "redirect", false);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.createContentEmbedCode = function (contentId, contentType, login) {
            return this.getTenant().then(function (data, textStatus, jqXHR) {
                if (Common.isNullOrEmpty(data))
                    return;
                var tag = "<div id=\"classtreamMiniFlashContent\" align=\"center\">"
                    + "\n<script type=\"text/javascript\" src=" + data.simplePlayerUrl + " charset=\"UTF-8\"></script><script type=\"text/javascript\">"
                    + "\n<!--"
                    + "\n// 幅480px×高さ270px未満に変更した場合、デザインが崩れることがあります。"
                    + "\nClasstream.load(\"classtreamMiniFlashContent\",\"480\",\"270\",\"" + this.tenantId + "\",\"" + contentType + "\",\"" + contentId + "\",\"" + (login ? "1" : "2") + "\");"
                    + "\n// -->"
                    + "\n</script>"
                    + "\n</div>"
                    + "\n<noscript><p>JavaScriptを有効にしてください</p></noscript>";
                return jqCls.Deferred().resolve(tag, textStatus, jqXHR);
            });
        };
        WebApi.prototype.updateVodThumbnail = function (contentId, thumbnail) {
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/upload-thumbnail";
            var formData = new FormData();
            formData.append('thumbnail_file', thumbnail, thumbnail.name);
            return this.jqClsAjax({ url: url,
                type: 'POST',
                processData: false,
                contentType: false,
                cache: false,
                dataType: 'json',
                data: formData
            });
        };
        WebApi.prototype.deleteVodThumbnail = function (contentId) {
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/delete-thumbnail";
            return this.jqClsDelete(url);
        };
        WebApi.prototype.updateVodMaterial = function (contentId, material) {
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/upload-material";
            var formData = new FormData();
            formData.append('material_file', material, material.name);
            return this.jqClsAjax({ url: url,
                type: 'POST',
                processData: false,
                contentType: false,
                cache: false,
                dataType: 'json',
                data: formData
            });
        };
        WebApi.prototype.deleteVodMaterial = function (contentId) {
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/delete-material";
            return this.jqClsDelete(url);
        };
        WebApi.prototype.updateVodPopup = function (contentId, popup) {
            if (popup.popupMessage) {
                popup.popUpMessage = popup.popupMessage;
            }
            var url = this.getTenantUrl() + "/vod-contents/" + contentId + "/popup";
            return this.jqClsPost(url, popup);
        };
        WebApi.prototype.orderVodContentByPoint = function (contentId) {
            var url = this.getVodContentUrl(contentId) + "/point-order";
            return this.jqClsPost(url, null);
        };
        WebApi.prototype.getVodPointOrders = function () {
            var self = this;
            var url = this.getTenantUrl() + "/vod-contents/point-orders";
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data == null)
                    return;
                var contents = data;
                for (var i = 0; i < contents.length; i++) {
                    var content = contents[i];
                    self.appendContetnInfo(WebApi.Model.ContentType.V, content);
                }
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.orderVodContentByPaypal = function (contentId, email) {
            var url = this.getVodContentUrl(contentId) + "/paypal-order";
            var params = {
                email: email
            };
            return this.jqClsPost(url, params);
        };
        WebApi.prototype.getLiveContent = function (contentId, options) {
            if (options === void 0) { options = null; }
            var self = this;
            var url = this.getLiveContentUrl(contentId);
            if (options == null)
                options = {};
            var query = "";
            query = Url.Query.join(query, "addDirectAccessUrl", options["addDirectAccessUrl"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data == null)
                    return;
                var content = data;
                self.appendContetnInfo(WebApi.Model.ContentType.L, content);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getLiveContents = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getTenantUrl() + "/live-contents";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            var sortOrderStr = null;
            if (Common.isNumber(searchOptions["sortOrder"])) {
                sortOrderStr = WebApi.Model.SortOrder[searchOptions["sortOrder"]];
            }
            else {
                sortOrderStr = searchOptions["sortOrder"];
            }
            query = Url.Query.join(query, "addDirectAccessUrl", searchOptions["addDirectAccessUrl"]);
            query = Url.Query.join(query, "userNo", searchOptions["userNo"]);
            query = Url.Query.join(query, "status", searchOptions["status"]);
            query = Url.Query.join(query, "offset", searchOptions["offset"]);
            query = Url.Query.join(query, "limit", searchOptions["limit"]);
            query = Url.Query.join(query, "sortType", searchOptions["sortType"]);
            query = Url.Query.join(query, "sortOrder", sortOrderStr);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data == null)
                    return;
                var contents = data;
                for (var i = 0; i < contents.length; i++) {
                    var content = contents[i];
                    self.appendContetnInfo(WebApi.Model.ContentType.L, content);
                }
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getLiveContentsCount = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var url = this.getTenantUrl() + "/live-contents/count";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            query = Url.Query.join(query, "status", searchOptions["status"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.registerLiveContent = function (content) {
            var url = this.getTenantUrl() + "/live-contents";
            return this.jqClsPost(url, content);
        };
        WebApi.prototype.updateLiveContent = function (contentId, content) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId;
            return this.jqClsPost(url, content);
        };
        WebApi.prototype.deleteLiveContent = function (contentId) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId;
            return this.jqClsDelete(url);
        };
        WebApi.prototype.getLiveDirectUrl = function (contentId) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId + "/direct-url";
            return this.jqClsGet(url);
        };
        WebApi.prototype.updateLiveThumbnail = function (contentId, thumbnail) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId + "/upload-thumbnail";
            var formData = new FormData();
            formData.append('thumbnail_file', thumbnail, thumbnail.name);
            return this.jqClsAjax({ url: url,
                type: 'POST',
                processData: false,
                contentType: false,
                cache: false,
                dataType: 'json',
                data: formData
            });
        };
        WebApi.prototype.deleteLiveThumbnail = function (contentId) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId + "/delete-thumbnail";
            return this.jqClsDelete(url);
        };
        WebApi.prototype.updateLiveMaterial = function (contentId, material) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId + "/upload-material";
            var formData = new FormData();
            formData.append('material_file', material, material.name);
            return this.jqClsAjax({ url: url,
                type: 'POST',
                processData: false,
                contentType: false,
                cache: false,
                dataType: 'json',
                data: formData
            });
        };
        WebApi.prototype.orderLiveContentByPoint = function (contentId) {
            var url = this.getLiveContentUrl(contentId) + "/point-order";
            return this.jqClsPost(url, null);
        };
        WebApi.prototype.getLivePointOrders = function () {
            var self = this;
            var url = this.getTenantUrl() + "/live-contents/point-orders";
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data == null)
                    return;
                var contents = data;
                for (var i = 0; i < contents.length; i++) {
                    var content = contents[i];
                    self.appendContetnInfo(WebApi.Model.ContentType.L, content);
                }
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.paypalOrderLiveContent = function (contentId, email) {
            var url = this.getLiveContentUrl(contentId) + "/paypal-order";
            var params = {
                email: email
            };
            return this.jqClsPost(url, params);
        };
        WebApi.prototype.deleteLiveMaterial = function (contentId) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId + "/delete-material";
            return this.jqClsDelete(url);
        };
        WebApi.prototype.getVodSami = function (contentId) {
            var url = this.getVodContentUrl(contentId) + "/sami";
            var query = Url.Query.join(query, "noCache", this.noCache);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getLiveCasterInfo = function (contentId, caster) {
            var url = this.getTenantUrl() + "/live-contents/" + contentId + "/caster?";
            var query = "";
            query = Url.Query.join(query, "format", caster.format);
            query = Url.Query.join(query, "codec", caster.codec);
            query = Url.Query.join(query, "record", caster.record);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodSamiImageUrl = function (contentId, name) {
            var self = this;
            var url = this.getVodContentUrl(contentId) + "/sami/images/" + name;
            var query = Url.Query.join(query, "noCache", this.noCache);
            return Url.joinQuery2(url, query);
        };
        WebApi.prototype.getVodPDFUrl = function (contentId) {
            var self = this;
            var url = this.getVodContentUrl(contentId) + "/pdf";
            var query = Url.Query.join(query, "noCache", this.noCache);
            return Url.joinQuery2(url, query);
        };
        WebApi.prototype.getVodPDFTimeFile = function (contentId) {
            var self = this;
            var url = this.getVodContentUrl(contentId) + "/pdf/time";
            var query = Url.Query.join(query, "noCache", this.noCache);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodPDFTimes = function (contentId) {
            return this.getVodPDFTimeFile(contentId)
                .then(function (data, textStatus, jqXHR) {
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            }, function (error) {
                return jqCls.Deferred().reject({ status: error.status, statusText: error.statusText });
            });
        };
        WebApi.prototype.getViewAuthTicket = function (contentType, contentId, userId) {
            if (userId === void 0) { userId = null; }
            var user = "own";
            if (Common.isNumber(userId)) {
                user = String(userId);
            }
            var url = this.getContentUrl(contentType, contentId) + "/view-auth-ticket/" + user;
            return this.jqClsGet(url);
        };
        WebApi.prototype.getCategories = function (alias, partialMatch, parentId, sortType, sortOrder) {
            if (alias === void 0) { alias = null; }
            if (partialMatch === void 0) { partialMatch = null; }
            if (parentId === void 0) { parentId = null; }
            if (sortType === void 0) { sortType = null; }
            if (sortOrder === void 0) { sortOrder = null; }
            var url = this.getTenantUrl() + "/categories";
            var query = "";
            query = Url.Query.join(query, "alias", alias);
            query = Url.Query.join(query, "partialMatch", partialMatch);
            if (parentId != null)
                query = Url.Query.join(query, "parentId", parentId);
            if (sortType != null)
                query = Url.Query.join(query, "sortType", sortType);
            if (sortOrder != null)
                query = Url.Query.join(query, "sortOrder", WebApi.Model.SortOrder[sortOrder]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.registerCategory = function (category) {
            var url = this.getTenantUrl() + "/categories";
            return this.jqClsPost(url, category);
        };
        WebApi.prototype.updateCategory = function (categoryId, category) {
            var url = this.getTenantUrl() + "/categories/" + categoryId;
            category.alias = "";
            category.clearAlias = false;
            category.summary = "";
            category.clearSummary = false;
            return this.jqClsPost(url, category);
        };
        WebApi.prototype.deleteCategory = function (categoryId, force) {
            var url = this.getTenantUrl() + "/categories/" + categoryId;
            var query = "";
            query = Url.Query.join(query, "force", force);
            url = Url.joinQuery2(url, query);
            return this.jqClsDelete(url);
        };
        WebApi.prototype.getUserRanks = function () {
            var url = this.getTenantUrl() + "/user-ranks";
            return this.jqClsGet(url);
        };
        WebApi.prototype.getUserRank = function (rankId) {
            var url = this.getTenantUrl() + "/user-ranks/" + rankId;
            return this.jqClsGet(url);
        };
        WebApi.prototype.registerUserRank = function (userRank) {
            var url = this.getTenantUrl() + "/user-ranks";
            return this.jqClsPost(url, userRank);
        };
        WebApi.prototype.updateUserRank = function (rankId, userRank) {
            var url = this.getTenantUrl() + "/user-ranks/" + rankId;
            return this.jqClsPost(url, userRank);
        };
        WebApi.prototype.deleteUserRank = function (rankId) {
            var url = this.getTenantUrl() + "/user-ranks/" + rankId;
            return this.jqClsDelete(url);
        };
        WebApi.prototype.updateVodPickupOrders = function (contentIds) {
            var url = this.getTenantUrl() + "/vod-contents/pickup-orders";
            var pickupOrder = {
                contentIds: contentIds
            };
            return this.jqClsPost(url, pickupOrder);
        };
        WebApi.prototype.getVodPickupOrders = function () {
            var self = this;
            var url = this.getTenantUrl() + "/vod-contents/pickup-orders";
            return this.jqClsGet(url).then(function (data, textStatus, jqXHR) {
                if (data == null)
                    return;
                var contents = data;
                for (var i = 0; i < contents.length; i++) {
                    var content = contents[i];
                    self.appendContetnInfo(WebApi.Model.ContentType.V, content);
                }
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getExportViewingLogsUrl = function (exportInfo) {
            var url = this.getTenantUrl() + "/viewing-logs";
            var query = "";
            query = Url.Query.join(query, "contentType", exportInfo.contentType);
            query = Url.Query.join(query, "paypal", exportInfo.paypal);
            query = Url.Query.join(query, "startDate", exportInfo.startDate);
            query = Url.Query.join(query, "endDate", exportInfo.endDate);
            url = Url.joinQuery2(url, query);
            return url;
        };
        WebApi.prototype.getExportUserOrderHistoriesUrl = function (exportInfo) {
            var url = this.getTenantUrl() + "/user-order-histories";
            var query = "";
            query = Url.Query.join(query, "contentType", exportInfo.contentType);
            query = Url.Query.join(query, "paypal", exportInfo.paypal);
            query = Url.Query.join(query, "startDate", exportInfo.startDate);
            query = Url.Query.join(query, "endDate", exportInfo.endDate);
            url = Url.joinQuery2(url, query);
            return url;
        };
        WebApi.prototype.getNotices = function (show) {
            if (show === void 0) { show = true; }
            var self = this;
            var url = this.getTenantUrl() + "/notices";
            var query = "";
            query = Url.Query.join(query, "show", show);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodCommentsByContentId = function (contentId, searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            return this.getCommentsByContentId(WebApi.Model.ContentType.V, contentId, searchOptions);
        };
        WebApi.prototype.getLiveCommentsByContentId = function (contentId, searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            return this.getCommentsByContentId(WebApi.Model.ContentType.L, contentId, searchOptions);
        };
        WebApi.prototype.getCommentsByContentId = function (contentType, contentId, searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getContentUrl(contentType, contentId) + "/comments";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            query = Url.Query.join(query, "commentId", searchOptions["commentId"]);
            query = Url.Query.join(query, "searchType", searchOptions["searchType"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodComment = function (contentId, commentId) {
            return this.getComment(WebApi.Model.ContentType.V, contentId, commentId);
        };
        WebApi.prototype.getLiveComment = function (contentId, commentId) {
            return this.getComment(WebApi.Model.ContentType.L, contentId, commentId);
        };
        WebApi.prototype.getComment = function (contentType, contentId, commentId) {
            var url = this.getContentUrl(contentType, contentId) + "/comments/" + commentId;
            return this.jqClsGet(url);
        };
        WebApi.prototype.registerVodComment = function (contentId, comment) {
            return this.registerComment(WebApi.Model.ContentType.V, contentId, comment);
        };
        WebApi.prototype.registerLiveComment = function (contentId, comment) {
            return this.registerComment(WebApi.Model.ContentType.L, contentId, comment);
        };
        WebApi.prototype.registerComment = function (contentType, contentId, comment) {
            var url = this.getContentUrl(contentType, contentId) + "/comments";
            return this.jqClsPost(url, {
                comment: comment
            });
        };
        WebApi.prototype.deleteVodComment = function (contentId, commentId) {
            return this.deleteComment(WebApi.Model.ContentType.V, contentId, commentId);
        };
        WebApi.prototype.deleteLiveComment = function (contentId, commentId) {
            return this.deleteComment(WebApi.Model.ContentType.L, contentId, commentId);
        };
        WebApi.prototype.deleteComment = function (contentType, contentId, commentId) {
            var url = this.getContentUrl(contentType, contentId) + "/comments/" + commentId;
            return this.jqClsDelete(url);
        };
        WebApi.prototype.checkVodComment = function (contentId) {
            return this.checkComment(WebApi.Model.ContentType.V, contentId);
        };
        WebApi.prototype.checkLiveComment = function (contentId) {
            return this.checkComment(WebApi.Model.ContentType.L, contentId);
        };
        WebApi.prototype.checkComment = function (contentType, contentId) {
            var self = this;
            var url = WebApi.API_URL + "/test/comment";
            var query = "";
            query = Url.Query.join(query, "tenantId", this.tenantId);
            query = Url.Query.join(query, "contentId", contentId);
            query = Url.Query.join(query, "contentType", WebApi.Model.ContentType[contentType]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodContentRepGeoPositions = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getTenantUrl() + "/vod-contents/rep-geo-positions";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            var sortOrderStr = null;
            query = Url.Query.join(query, "minLatitude", searchOptions["minLatitude"]);
            query = Url.Query.join(query, "minLongitude", searchOptions["minLongitude"]);
            query = Url.Query.join(query, "maxLatitude", searchOptions["maxLatitude"]);
            query = Url.Query.join(query, "maxLongitude", searchOptions["maxLongitude"]);
            if (Common.isNumber(searchOptions["sortOrder"])) {
                sortOrderStr = WebApi.Model.SortOrder[searchOptions["sortOrder"]];
            }
            else {
                sortOrderStr = searchOptions["sortOrder"];
            }
            var searchQuery = searchOptions["searchQuery"];
            if (!Common.isNullOrEmpty(searchQuery)) {
                query = Url.Query.join(query, "q", encodeURIComponent(searchQuery));
            }
            query = Url.Query.join(query, "qt", searchOptions["searchTarget"]);
            query = Url.Query.join(query, "categoryId", searchOptions["categoryId"]);
            var categoryAlias = searchOptions["categoryAlias"];
            if (!Common.isNullOrEmpty(categoryAlias)) {
                query = Url.Query.join(query, "categoryAlias", encodeURIComponent(categoryAlias));
            }
            query = Url.Query.join(query, "recursive", searchOptions["recursive"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodContentRepGeoPosition = function (contentId, all) {
            if (all === void 0) { all = null; }
            var self = this;
            var url = this.getVodContentUrl(contentId) + "/rep-geo-position";
            var query = "";
            query = Url.Query.join(query, "all", all);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getVodContentGeoPositions = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getTenantUrl() + "/vod-contents/geo-positions";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            var searchDate = searchOptions["searchDate"];
            if (searchDate != null && Object.prototype.toString.call(searchDate) == "[object Date]") {
                searchDate = Common.dateToUTSString(searchDate);
            }
            query = Url.Query.join(query, "searchDate", searchDate, true);
            query = Url.Query.join(query, "timeInterval", searchOptions["timeInterval"]);
            query = Url.Query.join(query, "minLatitude", searchOptions["minLatitude"]);
            query = Url.Query.join(query, "minLongitude", searchOptions["minLongitude"]);
            query = Url.Query.join(query, "maxLatitude", searchOptions["maxLatitude"]);
            query = Url.Query.join(query, "maxLongitude", searchOptions["maxLongitude"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getLiveContentGeoPositions = function (searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getTenantUrl() + "/live-contents/geo-positions";
            if (searchOptions == null)
                searchOptions = {};
            var query = "";
            query = Url.Query.join(query, "status", searchOptions["status"]);
            query = Url.Query.join(query, "timeInterval", searchOptions["timeInterval"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.getLiveContentGeoPositionsByContentId = function (contentId, searchOptions) {
            if (searchOptions === void 0) { searchOptions = null; }
            var self = this;
            var url = this.getLiveContentUrl(contentId) + "/geo-positions";
            var query = "";
            var searchStartDate = searchOptions["searchStartDate"];
            if (searchStartDate != null && Object.prototype.toString.call(searchStartDate) == "[object Date]") {
                searchStartDate = Common.dateToUTSString(searchStartDate);
            }
            var searchEndDate = searchOptions["searchEndDate"];
            if (searchEndDate != null && Object.prototype.toString.call(searchEndDate) == "[object Date]") {
                searchEndDate = Common.dateToUTSString(searchEndDate);
            }
            query = Url.Query.join(query, "searchStartDate", searchStartDate, true);
            query = Url.Query.join(query, "searchEndDate", searchEndDate, true);
            query = Url.Query.join(query, "timeInterval", searchOptions["timeInterval"]);
            query = Url.Query.join(query, "latestOne", searchOptions["latestOne"]);
            url = Url.joinQuery2(url, query);
            return this.jqClsGet(url);
        };
        WebApi.prototype.startSessionCheck = function () {
            var self = this;
            if (!this.isStartPolling) {
                this.isStartPolling = true;
                var url = this.getTenantUrl() + "/session/check";
                window.setTimeout(jqCls.proxy(self.startPolling, self, url), WebApi.POLLING_INTERVAL);
            }
        };
        WebApi.prototype.stopSessionCheck = function () {
            this.isStartPolling = false;
        };
        WebApi.prototype.startPolling = function (url) {
            var self = this;
            this.jqClsGet(url, WebApi.Model.RequestType.Polling).fail(function (jqXHR, textStatus, errorThrown) {
                self.pollingRetryCount += 1;
                if (self.pollingRetryCount > WebApi.POLLING_RETRY_MAX_COUNT) {
                    self.isStartPolling = false;
                }
            }).always(function () {
                if (!self.isStartPolling) {
                    return;
                }
                window.setTimeout(jqCls.proxy(self.startPolling, self, url), WebApi.POLLING_INTERVAL);
            });
        };
        WebApi.prototype.getVodVideoSrcByAuthTicket = function (authTicket, hls, region) {
            var self = this;
            var url = this.getContentUrlForAuthTicket(WebApi.Model.ContentType.V) + "video-src";
            return this.jqClsPost(url, {
                authTicket: authTicket,
                hls: hls,
                region: region
            }).then(function (data, textStatus, jqXHR) {
                self.keepCompatibilityVideoSrcWatermark(data);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.getLiveVideoSrcByAuthTicket = function (authTicket, hls, region) {
            var self = this;
            var url = this.getContentUrlForAuthTicket(WebApi.Model.ContentType.L) + "video-src";
            return this.jqClsPost(url, {
                authTicket: authTicket,
                hls: hls,
                region: region
            }).then(function (data, textStatus, jqXHR) {
                self.keepCompatibilityVideoSrcWatermark(data);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            });
        };
        WebApi.prototype.registerViewingLogByAuthTicket = function (contentType, authTicket) {
            var url = this.getContentUrlForAuthTicket(contentType) + "viewinglog";
            return this.jqClsPost(url, {
                authTicket: authTicket
            });
        };
        WebApi.prototype.updateViewingLogEndDateByAuthTicket = function (contentType, viewId, currentTimeRate, authTicket, async) {
            if (viewId == null)
                return;
            var url = this.getContentUrlForAuthTicket(contentType) + "viewinglog/" + viewId + "/end-date";
            return this.updateViewingLogEndDateBase(url, {
                currentTimeRate: currentTimeRate,
                authTicket: authTicket
            }, async);
        };
        WebApi.prototype.registerPhlsKey = function (contentType, authTicket) {
            var url = this.getContentUrlForAuthTicket(contentType) + "phlskey";
            return this.jqClsPost(url, {
                authTicket: authTicket
            });
        };
        WebApi.testCookie = function () {
            if (!navigator.cookieEnabled) {
                return;
            }
            jqCls.ajaxSetup({
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
            jqCls.get(WebApi.API_URL + "/test/cookie").then(function (data, textStatus, jqXHR) {
                if (data.enable == true) {
                    Common.sessionStorage.removeItem(WebApi.SS_KEY_CHECKED_COOKIE);
                }
                else {
                    var checked = Common.sessionStorage.getItem(WebApi.SS_KEY_CHECKED_COOKIE);
                    if (checked != "true") {
                        Common.sessionStorage.setItem(WebApi.SS_KEY_CHECKED_COOKIE, "true");
                        window.location.href = WebApi.API_URL + "/redirect?url=" + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
                    }
                }
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
            });
        };
        WebApi.getErrorCode = function (jqXHR) {
            var errorCode = null;
            if (jqXHR != null && jqXHR.responseJSON != null) {
                if (jqXHR.responseJSON.error != null && Common.isNumber(jqXHR.responseJSON.error.code)) {
                    errorCode = jqXHR.responseJSON.error.code;
                }
            }
            return errorCode;
        };
        WebApi.isErrorCode = function (jqXHR, errorCode) {
            var ret = false;
            var targetErrorCode = WebApi.getErrorCode(jqXHR);
            if (targetErrorCode != null) {
                ret = (targetErrorCode == errorCode);
            }
            return ret;
        };
        WebApi.isEmptyErrorCode = function (jqXHR) {
            var ret = true;
            if (jqXHR != null && jqXHR.responseJSON != null) {
                var error = jqXHR.responseJSON.error;
                if (error != null && Common.isNumber(error.code)) {
                    ret = false;
                }
            }
            return ret;
        };
        WebApi.getErrorMessage = function (jqXHR) {
            var ret = null;
            if (jqXHR != null && jqXHR.responseJSON != null) {
                var error = jqXHR.responseJSON.error;
                if (error != null) {
                    ret = error.message;
                }
            }
            return ret;
        };
        WebApi.existsMaterial = function (content) {
            if (!Common.isNullOrEmpty(content.uploadFileName) && ("(未設定)" !== content.uploadFileName) && ("(削除)" !== content.uploadFileName)) {
                return true;
            }
            else {
                return false;
            }
        };
        WebApi.isGuest = function (user) {
            if (user == null)
                return false;
            return (WebApi.Model.UserType.GUEST == user.userType);
        };
        WebApi.isAdmin = function (user) {
            if (user == null)
                return false;
            return (WebApi.Model.UserType.ADMIN == user.userType);
        };
        WebApi.isGeneral = function (user) {
            if (user == null)
                return false;
            return (WebApi.Model.UserType.GENERAL == user.userType);
        };
        WebApi.isGeneralOrAdmin = function (user) {
            if (user == null)
                return false;
            return (WebApi.Model.UserType.GENERAL == user.userType || WebApi.Model.UserType.ADMIN == user.userType);
        };
        WebApi.prototype.appendContetnInfo = function (contentType, content) {
            content.thumbnailLarge2Url = this.getThumbnailUrl(contentType, content.contentId, WebApi.Model.ThumbnailSize.Large2);
            content.thumbnailLargeUrl = this.getThumbnailUrl(contentType, content.contentId, WebApi.Model.ThumbnailSize.Large);
            content.thumbnailMiddleUrl = this.getThumbnailUrl(contentType, content.contentId, WebApi.Model.ThumbnailSize.Middle);
            content.thumbnailSmallUrl = this.getThumbnailUrl(contentType, content.contentId, WebApi.Model.ThumbnailSize.Small);
            if (WebApi.existsMaterial(content)) {
                content.materialUrl = this.getMaterialUrl(contentType, content.contentId);
            }
        };
        WebApi.prototype.jqClsPost = function (url, data, requestType, message) {
            if (requestType === void 0) { requestType = WebApi.Model.RequestType.Other; }
            if (message === void 0) { message = null; }
            var self = this;
            return jqCls.post(url, data).then(function (data, textStatus, jqXHR) {
                self.triggerDone(this.url, data, textStatus, jqXHR, requestType, message);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.triggerFail(this.url, jqXHR, textStatus, errorThrown, requestType, message);
            });
        };
        WebApi.prototype.jqClsGet = function (url, requestType, message) {
            if (requestType === void 0) { requestType = WebApi.Model.RequestType.Other; }
            if (message === void 0) { message = null; }
            var self = this;
            return jqCls.get(url).then(function (data, textStatus, jqXHR) {
                self.triggerDone(this.url, data, textStatus, jqXHR, requestType, message);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.triggerFail(this.url, jqXHR, textStatus, errorThrown, requestType, message);
            });
        };
        WebApi.prototype.jqClsDelete = function (url, requestType, message) {
            if (requestType === void 0) { requestType = WebApi.Model.RequestType.Other; }
            if (message === void 0) { message = null; }
            var self = this;
            return jqCls.ajax({
                url: url,
                type: 'DELETE',
                contentType: 'application/json',
                dataType: 'text' }).then(function (data, textStatus, jqXHR) {
                self.triggerDone(this.url, data, textStatus, jqXHR, requestType, message);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.triggerFail(this.url, jqXHR, textStatus, errorThrown, requestType, message);
            });
        };
        WebApi.prototype.jqClsAjax = function (settings, requestType, message) {
            if (requestType === void 0) { requestType = WebApi.Model.RequestType.Other; }
            if (message === void 0) { message = null; }
            var self = this;
            return jqCls.ajax(settings).then(function (data, textStatus, jqXHR) {
                self.triggerDone(this.url, data, textStatus, jqXHR, requestType, message);
                return jqCls.Deferred().resolve(data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.triggerFail(this.url, jqXHR, textStatus, errorThrown, requestType, message);
            });
        };
        WebApi.API_URL = Classtream.WebApiConfig.API_URL;
        WebApi.SS_KEY_CHECKED_COOKIE = "ClasstreamCheckedCookie";
        WebApi.TRIGGER_DONE = "done";
        WebApi.TRIGGER_FAIL = "fail";
        WebApi.TRIGGER_FAIL_401_WITHOUT_LOGIN_LOGOUT = "fail401WithoutLoginLogout";
        WebApi.LOGIN_VERSION = 2;
        WebApi.POLLING_INTERVAL = 5 * 1000 * 60;
        WebApi.POLLING_RETRY_MAX_COUNT = 10;
        return WebApi;
    }());
    Classtream.WebApi = WebApi;
    var ClsStorage = (function () {
        function ClsStorage(storage) {
            this.storage = storage;
        }
        ClsStorage.prototype.getItem = function (key) {
            var item = this.getItemWithHeader(key);
            if (item != null) {
                return item.data;
            }
            return null;
        };
        ClsStorage.prototype.setItem = function (key, data, period, notUpdateExpiration) {
            if (notUpdateExpiration === void 0) { notUpdateExpiration = false; }
            var obj = this.getItemWithHeader(key);
            if (obj == null) {
                obj = {};
                obj.creation = (new Date()).getTime();
                obj.expiration = (new Date()).getTime() + period * 1000;
            }
            else {
                if (!notUpdateExpiration) {
                    obj.expiration = (new Date()).getTime() + period * 1000;
                }
            }
            obj.update = (new Date()).getTime();
            obj.data = data;
            this.storage.setItem(key, JSON.stringify(obj));
        };
        ClsStorage.prototype.removeItem = function (key) {
            this.storage.removeItem(key);
        };
        ClsStorage.prototype.getItemWithHeader = function (key) {
            var ret = null;
            var item = null;
            try {
                item = JSON.parse(this.storage.getItem(key));
            }
            catch (e) {
                this.storage.removeItem(key);
            }
            if (item != null) {
                if (item.expiration && item.expiration > (new Date().getTime())) {
                    return item;
                }
                else {
                    this.storage.removeItem(key);
                }
            }
            return null;
        };
        ClsStorage.SEPARATOR = "@CLS@";
        return ClsStorage;
    }());
    Classtream.ClsStorage = ClsStorage;
    var Common = (function () {
        function Common() {
        }
        Common.initialize = function () {
            this.localStorage.setItem = function () { };
            this.localStorage.getItem = function () { return ""; };
            this.localStorage.removeItem = function () { };
            this.sessionStorage.setItem = function () { };
            this.sessionStorage.getItem = function () { return ""; };
            this.sessionStorage.removeItem = function () { };
            try {
                if (('localStorage' in window) && (window.localStorage !== null)) {
                    this.localStorage = window.localStorage;
                }
                if (('sessionStorage' in window) && (window.sessionStorage !== null)) {
                    this.sessionStorage = window.sessionStorage;
                }
            }
            catch (e) {
            }
            this.localStorageEx = new Classtream.ClsStorage(this.localStorage);
            this.sessionStorageEx = new Classtream.ClsStorage(this.sessionStorage);
        };
        Common.getValueWithTimstamp = function (value, period) {
            var ret = null;
            if (!Classtream.Common.isNullOrEmpty(value)) {
                var values = value.split(',');
                var timestamp = +values[1];
                if (Classtream.Common.isNumber(timestamp)) {
                    var diff = ((new Date).getTime() - (timestamp / 1000));
                    if (diff > period) {
                        ret = values[0];
                    }
                }
                return ret;
            }
        };
        Common.dateToUTSString = function (date) {
            if (date == null)
                return null;
            var yyyy = date.getUTCFullYear();
            var MM = date.getUTCMonth() + 1;
            if (MM < 10)
                MM = '0' + MM;
            var dd = date.getUTCDate();
            if (dd < 10)
                dd = '0' + dd;
            var HH = date.getUTCHours();
            if (HH < 10)
                HH = '0' + HH;
            var mm = date.getUTCMinutes();
            if (mm < 10)
                mm = '0' + mm;
            var ss = date.getUTCSeconds();
            if (ss < 10)
                ss = '0' + ss;
            return yyyy + '-' + MM + '-' + dd + 'T' + HH + ':' + mm + ':' + ss + '+00:00';
        };
        Common.getQueryString = function () {
            if (1 < document.location.search.length) {
                var query = document.location.search.substring(1);
                var parameters = query.split('&');
                var result = {};
                for (var i = 0; i < parameters.length; i++) {
                    var element = parameters[i].split('=');
                    var paramName = decodeURIComponent(element[0]);
                    var paramValue = decodeURIComponent(element[1]);
                    result[paramName] = decodeURIComponent(paramValue);
                }
                return result;
            }
            return null;
        };
        Common.getQueryString2 = function () {
            var ret = Common.getQueryString();
            if (ret == null) {
                ret = {};
            }
            return ret;
        };
        Common.isiPhone = function () {
            return Common._ua.iPhone;
        };
        Common.isTablet = function () {
            return Common._ua.Tablet;
        };
        Common.isMobile = function () {
            return Common._ua.Mobile;
        };
        Common.isPC = function () {
            return !Common._ua.Tablet && !Common._ua.Mobile;
        };
        Common.isiOS = function () {
            return Common._ua.iOS;
        };
        Common.hasFlash = function () {
            var hasFlash = false;
            try {
                var fo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
                if (fo)
                    hasFlash = true;
            }
            catch (e) {
                if (navigator.mimeTypes["application/x-shockwave-flash"] != undefined)
                    hasFlash = true;
            }
            return hasFlash;
        };
        Common.isHttpTunnelProtocol = function (src) {
            if (Common.isNullOrEmpty(src))
                return false;
            return (src.toLowerCase().indexOf('rtmpte://') === 0) || (src.toLowerCase().indexOf('rtmpt://') === 0);
        };
        Common.changeHttpTunnelProtocol = function (src) {
            if (src.toLowerCase().indexOf('rtmpe://') === 0) {
                return "rtmpte://" + src.substring(8);
            }
            else if (src.toLowerCase().indexOf('rtmp') === 0) {
                return "rtmpt://" + src.substring(7);
            }
            else {
                return src;
            }
        };
        Common.styleToJson = function (stylesStr) {
            if (Common.isNullOrEmpty(stylesStr))
                return {};
            var styles = stylesStr.split(';');
            var i = styles.length;
            if (i < 1)
                return {};
            var json = {}, style, k, v;
            while (i--) {
                style = styles[i].split(':');
                k = jqCls.trim(style[0]);
                v = jqCls.trim(style[1]);
                if (k.length > 0 && v.length > 0) {
                    json[k] = v;
                }
            }
            return json;
        };
        Common.getCookie = function (key) {
            var keyIndex = 0;
            var valueIndex = 0;
            var loadData = "";
            if (document.cookie.length > 0) {
                keyIndex = document.cookie.indexOf(key + "=");
                if (keyIndex != -1) {
                    keyIndex = keyIndex + key.length + 1;
                    valueIndex = document.cookie.indexOf(";", keyIndex);
                    if (valueIndex == -1)
                        valueIndex = document.cookie.length;
                    loadData = unescape(document.cookie.substring(keyIndex, valueIndex));
                }
            }
            return loadData;
        };
        Common.setCookie = function (key, value, availablePeriod) {
            if (!navigator.cookieEnabled) {
                return;
            }
            var path = location.pathname;
            var paths = new Array();
            paths = path.split("/");
            if (paths[paths.length - 1] != "") {
                paths[paths.length - 1] = "";
                path = paths.join("/");
            }
            var cookieString = "";
            cookieString += key + "=" + escape(value);
            cookieString += "; path=" + path;
            if (availablePeriod) {
                var currentTime = new Date().getTime();
                var availableTime = new Date(currentTime + (1000 * 60 * 60 * 24 * availablePeriod));
                var utcAvailableTime = availableTime.toUTCString();
                cookieString += "; expires=" + utcAvailableTime + "; ";
            }
            else {
                cookieString += "; ";
            }
            document.cookie = cookieString;
        };
        Common.deleteCookie = function (key) {
            var date1 = new Date();
            date1.setTime(0);
            var path = location.pathname;
            var paths = new Array();
            paths = path.split("/");
            if (paths[paths.length - 1] != "") {
                paths[paths.length - 1] = "";
                path = paths.join("/");
            }
            document.cookie = key + "=;path=" + path + ";expires=" + date1.toUTCString();
        };
        Common.isFirefox = function () {
            return (Common.getBrowser() === 'firefox');
        };
        Common.isSafari = function () {
            return (Common.getBrowser() === 'safari');
        };
        Common.getBrowser = function () {
            var ua = window.navigator.userAgent.toLowerCase();
            var ver = window.navigator.appVersion.toLowerCase();
            var name = 'unknown';
            if (ua.indexOf("msie") != -1) {
                if (ver.indexOf("msie 6.") != -1) {
                    name = 'ie6';
                }
                else if (ver.indexOf("msie 7.") != -1) {
                    name = 'ie7';
                }
                else if (ver.indexOf("msie 8.") != -1) {
                    name = 'ie8';
                }
                else if (ver.indexOf("msie 9.") != -1) {
                    name = 'ie9';
                }
                else if (ver.indexOf("msie 10.") != -1) {
                    name = 'ie10';
                }
                else {
                    name = 'ie';
                }
            }
            else if (ua.indexOf('trident/7') != -1) {
                name = 'ie11';
            }
            else if (ua.indexOf('edge') != -1) {
                name = 'edge';
            }
            else if (ua.indexOf('chrome') != -1) {
                name = 'chrome';
            }
            else if (ua.indexOf('safari') != -1) {
                name = 'safari';
            }
            else if (ua.indexOf('opera') != -1) {
                name = 'opera';
            }
            else if (ua.indexOf('firefox') != -1) {
                name = 'firefox';
            }
            return name;
        };
        ;
        Common.isNullOrEmpty = function (value) {
            return (value == null || value === "");
        };
        Common.isNumber = function (value) {
            return (!Common.isNullOrEmpty(value) && !isNaN(value));
        };
        Common.isReallyNaN = function (value) {
            return value !== value;
        };
        Common.getOption = function (target, defaultValue) {
            var result = defaultValue;
            try {
                if (window["options"] != null) {
                    var data = window["options"][target];
                    if (data !== undefined && String(data).length > 0) {
                        result = data;
                    }
                }
            }
            catch (e) {
            }
            return result;
        };
        Common.isBearerAuth = function () {
            var value = Classtream.Common.getOption("isBearerAuth", false);
            return (value.toString() == "true");
        };
        Common.localStorage = {};
        Common.sessionStorage = {};
        Common.localStorageEx = {};
        Common.sessionStorageEx = {};
        Common._ua = (function (u) {
            return {
                Tablet: u.indexOf("ipad") != -1
                    || (u.indexOf("android") != -1 && u.indexOf("mobile") == -1)
                    || (u.indexOf("firefox") != -1 && u.indexOf("tablet") != -1)
                    || u.indexOf("kindle") != -1
                    || u.indexOf("silk") != -1
                    || u.indexOf("playbook") != -1,
                Mobile: (u.indexOf("windows") != -1 && u.indexOf("phone") != -1)
                    || u.indexOf("iphone") != -1
                    || u.indexOf("ipod") != -1
                    || (u.indexOf("android") != -1 && u.indexOf("mobile") != -1)
                    || (u.indexOf("firefox") != -1 && u.indexOf("mobile") != -1)
                    || u.indexOf("blackberry") != -1,
                iPhone: (u.indexOf("iphone") != -1),
                iPad: (u.indexOf("ipad") != -1),
                iOS: (u.indexOf("ipad") != -1 || u.indexOf("iphone") != -1 || (u.indexOf("safari") != -1 && typeof document.ontouchstart !== 'undefined')),
                Android: (u.indexOf("android") != -1)
            };
        })(window.navigator.userAgent.toLowerCase());
        return Common;
    }());
    Classtream.Common = Common;
    Common.initialize();
    var Url = (function () {
        function Url() {
        }
        Url.joinQuery = function (url, name, value) {
            var query = Url.Query.makeQuery(name, value);
            return Url.joinQuery2(url, query);
        };
        Url.joinQuery2 = function (url, query) {
            if (Common.isNullOrEmpty(query)) {
                return url;
            }
            if (url.indexOf("?") == -1) {
                url += "?" + query;
            }
            else {
                url += "&" + query;
            }
            return url;
        };
        return Url;
    }());
    Classtream.Url = Url;
    var Logger = (function () {
        function Logger(header) {
            this.header = header;
            this.log = this.logging("log");
            this.debug = this.logging("debug");
            this.info = this.logging("info");
            this.warn = this.logging("warn");
            this.error = this.logging("error");
        }
        Logger.prototype.logging = function (type) {
            var noop = function noop() { };
            var consoleA = console || {
                'log': noop,
                'debug': noop,
                'info': noop,
                'warn': noop,
                'error': noop
            };
            if ((typeof Classtream.LogDebugMode === "undefined") || (!Classtream.LogDebugMode)) {
                if (type == "log" || type == "debug") {
                    return function () { };
                }
            }
            if (consoleA[type] != null && consoleA[type].apply) {
                return consoleA[type].bind(consoleA, this.header + ":");
            }
            else {
                return function () { };
            }
        };
        return Logger;
    }());
    Classtream.Logger = Logger;
})(Classtream || (Classtream = {}));
var Classtream;
(function (Classtream) {
    var WebApi;
    (function (WebApi) {
        WebApi.Version = "1.1.0";
        ;
        ;
        var Category = (function () {
            function Category() {
            }
            Category.listToTree = function (categories, isSortName) {
                if (isSortName === void 0) { isSortName = false; }
                if (categories == null)
                    return null;
                var root = new Array();
                if (isSortName) {
                    Category.sortName(categories);
                }
                var makeTree = function (categories, parent) {
                    parent.children = new Array();
                    for (var i = 0; i < categories.length; i++) {
                        var child = categories[i];
                        if (parent.categoryId == child.parentId) {
                            parent.children.push(child);
                            child.parent = parent;
                        }
                    }
                    for (var i = 0; i < parent.children.length; i++) {
                        var child = parent.children[i];
                        makeTree(categories, child);
                    }
                };
                for (var i = 0; i < categories.length; i++) {
                    var category = categories[i];
                    if (category.parentId == 0) {
                        makeTree(categories, category);
                        root.push(category);
                    }
                }
                return root;
            };
            Category.treeToList = function (tree, targetMarkFlg) {
                if (targetMarkFlg === void 0) { targetMarkFlg = false; }
                if (tree == null)
                    return null;
                var categories = new Array();
                var makeCategories = function (parents, categories) {
                    for (var i = 0; i <= parents.length - 1; i++) {
                        var category = parents[i];
                        if (!targetMarkFlg || category.markFlg) {
                            categories.push(category);
                            makeCategories(category.children, categories);
                        }
                    }
                };
                makeCategories(tree, categories);
                return categories;
            };
            Category.filterByContents = function (categories, contents, isSortName, isAppendParentName, separator) {
                if (isSortName === void 0) { isSortName = false; }
                if (isAppendParentName === void 0) { isAppendParentName = false; }
                if (separator === void 0) { separator = "/"; }
                if (categories == null)
                    return null;
                if (contents == null)
                    return null;
                var setMarkFlg = function (category) {
                    if (category == null)
                        return;
                    if (category.markFlg == true) {
                        return;
                    }
                    category.markFlg = true;
                    setMarkFlg(category.parent);
                };
                var categoryIds = new Object();
                var contentCount = (contents != null) ? contents.length : 0;
                for (var i = 0; i < contentCount; i++) {
                    var content = contents[i];
                    categoryIds[content.categoryId] = content.categoryId;
                }
                var tree = Category.listToTree(categories);
                for (var categoryId in categoryIds) {
                    var category = Category.findOneFromTree(tree, Number(categoryId));
                    setMarkFlg(category);
                }
                if (isAppendParentName) {
                    Category.appendLongNameToTree(tree, separator);
                }
                var filterCategories = Category.treeToList(tree, true);
                if (isSortName) {
                    Category.sortName(filterCategories);
                }
                return filterCategories;
            };
            Category.appendLongNameToCategories = function (categories, isSortName, separator) {
                if (isSortName === void 0) { isSortName = false; }
                if (separator === void 0) { separator = "/"; }
                if (categories == null)
                    return null;
                var tree = Classtream.WebApi.Category.listToTree(categories);
                Category.appendLongNameToTree(tree, separator);
                categories = Classtream.WebApi.Category.treeToList(tree);
                if (isSortName) {
                    Category.sortName(categories);
                }
                return categories;
            };
            Category.makeLongName = function (tree, categoryId, separator) {
                if (separator === void 0) { separator = "/"; }
                if (tree == null)
                    return null;
                var categoryLongName = "";
                var makeCategoryLongName = function (category) {
                    if (category == null)
                        return;
                    categoryLongName = category.name + ((categoryLongName == "") ? "" : separator + categoryLongName);
                    if (category.parent == null)
                        return;
                    makeCategoryLongName(category.parent);
                };
                var category = Category.findOneFromTree(tree, categoryId);
                makeCategoryLongName(category);
                return categoryLongName;
            };
            Category.findOneFromTree = function (tree, categoryId) {
                if (tree == null)
                    return null;
                var category = null;
                for (var i = 0; i < tree.length; i++) {
                    var root = tree[i];
                    if (root.categoryId == categoryId) {
                        category = root;
                    }
                    else {
                        category = Category.findOneFromTree(root.children, categoryId);
                    }
                    if (category != null) {
                        break;
                    }
                }
                return category;
            };
            Category.findOneFromTreeByAlias = function (tree, alias) {
                if (tree == null)
                    return null;
                var category = null;
                for (var i = 0; i < tree.length; i++) {
                    var root = tree[i];
                    if (root.alias == alias) {
                        category = root;
                    }
                    else {
                        category = Category.findOneFromTreeByAlias(root.children, alias);
                    }
                    if (category != null) {
                        break;
                    }
                }
                return category;
            };
            Category.findFromTreeByAlias = function (tree, alias) {
                if (tree == null)
                    return null;
                var categories = new Array();
                var find = function (tree) {
                    for (var i = 0; i < tree.length; i++) {
                        var root = tree[i];
                        if (root.alias == alias) {
                            categories.push(root);
                        }
                        find(root.children);
                    }
                };
                find(tree);
                return categories;
            };
            Category.sortName = function (categories) {
                categories.sort(function (a, b) {
                    if (a.name < b.name)
                        return -1;
                    if (a.name > b.name)
                        return 1;
                    return 0;
                });
            };
            Category.appendLongNameToTree = function (tree, separator) {
                if (separator === void 0) { separator = "/"; }
                if (tree == null)
                    return null;
                var makeCategoryName = function (parents, baseName) {
                    for (var i = 0; i <= parents.length - 1; i++) {
                        var category = parents[i];
                        if (baseName != "") {
                            category.longName = baseName + separator + category.name;
                        }
                        else {
                            category.longName = category.name;
                        }
                        makeCategoryName(category.children, category.longName);
                    }
                };
                makeCategoryName(tree, "");
            };
            return Category;
        }());
        WebApi.Category = Category;
    })(WebApi = Classtream.WebApi || (Classtream.WebApi = {}));
})(Classtream || (Classtream = {}));
var Classtream;
(function (Classtream) {
    var WebApi;
    (function (WebApi) {
        var Model;
        (function (Model) {
            Model.CONTENT_TYPE_V = "V";
            Model.CONTENT_TYPE_L = "L";
            (function (ContentType) {
                ContentType[ContentType["None"] = 0] = "None";
                ContentType[ContentType["V"] = 1] = "V";
                ContentType[ContentType["L"] = 2] = "L";
            })(Model.ContentType || (Model.ContentType = {}));
            var ContentType = Model.ContentType;
            (function (LiveVideoStatus) {
                LiveVideoStatus[LiveVideoStatus["Reserve"] = 0] = "Reserve";
                LiveVideoStatus[LiveVideoStatus["Start"] = 1] = "Start";
                LiveVideoStatus[LiveVideoStatus["Stop"] = 2] = "Stop";
                LiveVideoStatus[LiveVideoStatus["Finalize"] = 3] = "Finalize";
            })(Model.LiveVideoStatus || (Model.LiveVideoStatus = {}));
            var LiveVideoStatus = Model.LiveVideoStatus;
            (function (ThumbnailSize) {
                ThumbnailSize[ThumbnailSize["Large2"] = 0] = "Large2";
                ThumbnailSize[ThumbnailSize["Large"] = 1] = "Large";
                ThumbnailSize[ThumbnailSize["Middle"] = 2] = "Middle";
                ThumbnailSize[ThumbnailSize["Small"] = 3] = "Small";
            })(Model.ThumbnailSize || (Model.ThumbnailSize = {}));
            var ThumbnailSize = Model.ThumbnailSize;
            (function (RequestType) {
                RequestType[RequestType["Other"] = 0] = "Other";
                RequestType[RequestType["Login"] = 1] = "Login";
                RequestType[RequestType["Logout"] = 2] = "Logout";
                RequestType[RequestType["Polling"] = 3] = "Polling";
                RequestType[RequestType["CheckLogin"] = 4] = "CheckLogin";
                RequestType[RequestType["GetLoginUser"] = 5] = "GetLoginUser";
            })(Model.RequestType || (Model.RequestType = {}));
            var RequestType = Model.RequestType;
            (function (VodSortType) {
                VodSortType[VodSortType["Title"] = 1] = "Title";
                VodSortType[VodSortType["CreatedDate"] = 2] = "CreatedDate";
                VodSortType[VodSortType["UpdatedDate"] = 3] = "UpdatedDate";
                VodSortType[VodSortType["ReviewAverage"] = 4] = "ReviewAverage";
                VodSortType[VodSortType["ViewingCount"] = 5] = "ViewingCount";
                VodSortType[VodSortType["VodStartDate"] = 6] = "VodStartDate";
            })(Model.VodSortType || (Model.VodSortType = {}));
            var VodSortType = Model.VodSortType;
            (function (LiveSortType) {
                LiveSortType[LiveSortType["LiveStartDate"] = 1] = "LiveStartDate";
                LiveSortType[LiveSortType["Title"] = 2] = "Title";
            })(Model.LiveSortType || (Model.LiveSortType = {}));
            var LiveSortType = Model.LiveSortType;
            (function (SortOrder) {
                SortOrder[SortOrder["Asc"] = 0] = "Asc";
                SortOrder[SortOrder["Desc"] = 1] = "Desc";
            })(Model.SortOrder || (Model.SortOrder = {}));
            var SortOrder = Model.SortOrder;
            (function (SearchTarget) {
                SearchTarget[SearchTarget["Title"] = 1] = "Title";
                SearchTarget[SearchTarget["TitleSummary"] = 2] = "TitleSummary";
                SearchTarget[SearchTarget["TitleSummaryDetail"] = 3] = "TitleSummaryDetail";
                SearchTarget[SearchTarget["TitleSummaryDitailRemarks"] = 4] = "TitleSummaryDitailRemarks";
                SearchTarget[SearchTarget["Alias"] = 5] = "Alias";
            })(Model.SearchTarget || (Model.SearchTarget = {}));
            var SearchTarget = Model.SearchTarget;
            (function (ErrorCode) {
                ErrorCode[ErrorCode["CODE_401_NOT_PERMITTED_IP_ADDRESS"] = 401001] = "CODE_401_NOT_PERMITTED_IP_ADDRESS";
                ErrorCode[ErrorCode["CODE_401_EXPIRED_USER_ERROR"] = 401002] = "CODE_401_EXPIRED_USER_ERROR";
                ErrorCode[ErrorCode["CODE_401_NOT_FOUND_USER"] = 401003] = "CODE_401_NOT_FOUND_USER";
                ErrorCode[ErrorCode["CODE_401_INVALID_LOGIN"] = 401004] = "CODE_401_INVALID_LOGIN";
                ErrorCode[ErrorCode["CODE_401_NOT_FOUND_SESSION"] = 401005] = "CODE_401_NOT_FOUND_SESSION";
                ErrorCode[ErrorCode["CODE_401_NOT_FOUND_SIGNIN_SESSION"] = 401006] = "CODE_401_NOT_FOUND_SIGNIN_SESSION";
                ErrorCode[ErrorCode["CODE_401_MULTIPLE_LOGIN_ERROR"] = 401007] = "CODE_401_MULTIPLE_LOGIN_ERROR";
                ErrorCode[ErrorCode["CODE_401_INVALID_CSRF_TOKEN"] = 401008] = "CODE_401_INVALID_CSRF_TOKEN";
                ErrorCode[ErrorCode["CODE_401_INVALID_SITE"] = 401009] = "CODE_401_INVALID_SITE";
                ErrorCode[ErrorCode["CODE_401_INVALID_API_KEY"] = 401010] = "CODE_401_INVALID_API_KEY";
                ErrorCode[ErrorCode["CODE_401_USER_TYPE_ERROR"] = 401011] = "CODE_401_USER_TYPE_ERROR";
                ErrorCode[ErrorCode["CODE_401_INVALID_TENANT_ID"] = 401012] = "CODE_401_INVALID_TENANT_ID";
                ErrorCode[ErrorCode["CODE_401_TRIAL_PERIOD_EXPIRED"] = 401013] = "CODE_401_TRIAL_PERIOD_EXPIRED";
                ErrorCode[ErrorCode["CODE_401_INVALID_ONE_TIME_TICKET"] = 401014] = "CODE_401_INVALID_ONE_TIME_TICKET";
                ErrorCode[ErrorCode["CODE_403_FORBIDDEN_CONTENT"] = 403001] = "CODE_403_FORBIDDEN_CONTENT";
                ErrorCode[ErrorCode["CODE_403_NOT_SPORT_POINT_FUNCTION"] = 403002] = "CODE_403_NOT_SPORT_POINT_FUNCTION";
                ErrorCode[ErrorCode["CODE_403_INVALID_AUTH_TICKET"] = 403003] = "CODE_403_INVALID_AUTH_TICKET";
                ErrorCode[ErrorCode["CODE_403_INVALID_AUTH_TICKET_TIMEOUT"] = 403004] = "CODE_403_INVALID_AUTH_TICKET_TIMEOUT";
                ErrorCode[ErrorCode["CODE_403_INVALID_AUTH_TICKET_TYPE"] = 403005] = "CODE_403_INVALID_AUTH_TICKET_TYPE";
                ErrorCode[ErrorCode["CODE_403_NOT_FOUND_USER"] = 403006] = "CODE_403_NOT_FOUND_USER";
                ErrorCode[ErrorCode["CODE_403_GROUP_NOT_AVAILABLE"] = 403007] = "CODE_403_GROUP_NOT_AVAILABLE";
                ErrorCode[ErrorCode["CODE_403_NOT_MINNADETORU_USER"] = 403008] = "CODE_403_NOT_MINNADETORU_USER";
                ErrorCode[ErrorCode["CODE_403_FORBIDDEN_VOD_CONTENT_UPLOAD"] = 403009] = "CODE_403_FORBIDDEN_VOD_CONTENT_UPLOAD";
                ErrorCode[ErrorCode["CODE_403_CATEGORY_NOT_AVAILABLE"] = 403018] = "CODE_403_CATEGORY_NOT_AVAILABLE";
                ErrorCode[ErrorCode["CODE_403_NON_PURCHASED_CONTENT_BY_POINT"] = 403019] = "CODE_403_NON_PURCHASED_CONTENT_BY_POINT";
                ErrorCode[ErrorCode["CODE_403_INVALID_SPOT_ORDER_HASH"] = 403020] = "CODE_403_INVALID_SPOT_ORDER_HASH";
                ErrorCode[ErrorCode["CODE_403_POINT_SHORTAGE"] = 403021] = "CODE_403_POINT_SHORTAGE";
                ErrorCode[ErrorCode["CODE_403_LIVE_CONTENT_STATUS_FINALIZED"] = 403022] = "CODE_403_LIVE_CONTENT_STATUS_FINALIZED";
                ErrorCode[ErrorCode["CODE_403_CAN_NOT_CHANGE_PASSWORD"] = 403023] = "CODE_403_CAN_NOT_CHANGE_PASSWORD";
                ErrorCode[ErrorCode["CODE_403_FAILED_TO_ORDER_POINT_CONTENT"] = 403024] = "CODE_403_FAILED_TO_ORDER_POINT_CONTENT";
                ErrorCode[ErrorCode["CODE_403_FAILED_TO_GET_PAYPAL_CONTENT"] = 403025] = "CODE_403_FAILED_TO_GET_PAYPAL_CONTENT";
                ErrorCode[ErrorCode["CODE_403_FAILED_TO_ORDER_PAYPAL_CONTENT"] = 403026] = "CODE_403_FAILED_TO_ORDER_PAYPAL_CONTENT";
                ErrorCode[ErrorCode["CODE_403_UNPUBLISH"] = 403027] = "CODE_403_UNPUBLISH";
                ErrorCode[ErrorCode["CODE_403_UNPAID"] = 403028] = "CODE_403_UNPAID";
                ErrorCode[ErrorCode["CODE_403_EXPIRED"] = 403029] = "CODE_403_EXPIRED";
                ErrorCode[ErrorCode["CODE_403_FORBIDDEN_COMMENT_DELETE"] = 403030] = "CODE_403_FORBIDDEN_COMMENT_DELETE";
                ErrorCode[ErrorCode["CODE_403_INVALID_ST_TICKET_NOT_FOUND_SIGNIN_SESSION"] = 403031] = "CODE_403_INVALID_ST_TICKET_NOT_FOUND_SIGNIN_SESSION";
                ErrorCode[ErrorCode["CODE_403_MAP_IS_NOT_ENABLED"] = 403032] = "CODE_403_MAP_IS_NOT_ENABLED";
                ErrorCode[ErrorCode["CODE_403_INVALID_CLIENT_IP"] = 403033] = "CODE_403_INVALID_CLIENT_IP";
                ErrorCode[ErrorCode["CODE_403_INVALID_API_KEY"] = 403034] = "CODE_403_INVALID_API_KEY";
                ErrorCode[ErrorCode["CODE_403_FORBIDDEN_USER_UPDATE"] = 403035] = "CODE_403_FORBIDDEN_USER_UPDATE";
                ErrorCode[ErrorCode["CODE_403_FORBIDDEN_USER_DELETE"] = 403036] = "CODE_403_FORBIDDEN_USER_DELETE";
                ErrorCode[ErrorCode["CODE_403_WEBRTC_IS_NOT_ENABLED"] = 403037] = "CODE_403_WEBRTC_IS_NOT_ENABLED";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_CONTENT"] = 404001] = "CODE_404_NOT_FOUND_CONTENT";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_USER"] = 404002] = "CODE_404_NOT_FOUND_USER";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_VOD_FILE"] = 404003] = "CODE_404_NOT_FOUND_VOD_FILE";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_SAMI_FILE"] = 404004] = "CODE_404_NOT_FOUND_SAMI_FILE";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_SAMI_IMAGE"] = 404005] = "CODE_404_NOT_FOUND_SAMI_IMAGE";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_PDF_FILE"] = 404006] = "CODE_404_NOT_FOUND_PDF_FILE";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_PDF_CHAPTER_FILE"] = 404007] = "CODE_404_NOT_FOUND_PDF_CHAPTER_FILE";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_CATEGORY"] = 404008] = "CODE_404_NOT_FOUND_CATEGORY";
                ErrorCode[ErrorCode["CODE_404_NOT_FOUND_GROUP"] = 404009] = "CODE_404_NOT_FOUND_GROUP";
                ErrorCode[ErrorCode["CODE_500_INTERNAL_SERVER_ERROR"] = 500001] = "CODE_500_INTERNAL_SERVER_ERROR";
                ErrorCode[ErrorCode["CODE_503_MAINTENANCE"] = 503001] = "CODE_503_MAINTENANCE";
                ErrorCode[ErrorCode["CODE_503_TOO_MANY_CONNECTIONS"] = 503002] = "CODE_503_TOO_MANY_CONNECTIONS";
            })(Model.ErrorCode || (Model.ErrorCode = {}));
            var ErrorCode = Model.ErrorCode;
            (function (UserType) {
                UserType[UserType["GENERAL"] = 0] = "GENERAL";
                UserType[UserType["ADMIN"] = 1] = "ADMIN";
                UserType[UserType["GUEST"] = 2] = "GUEST";
                UserType[UserType["CASTER"] = 3] = "CASTER";
            })(Model.UserType || (Model.UserType = {}));
            var UserType = Model.UserType;
            (function (UserAuth) {
                UserAuth[UserAuth["NONE"] = 0] = "NONE";
                UserAuth[UserAuth["USER_ADMIN"] = 1] = "USER_ADMIN";
            })(Model.UserAuth || (Model.UserAuth = {}));
            var UserAuth = Model.UserAuth;
            var ViewInfo = (function () {
                function ViewInfo() {
                }
                return ViewInfo;
            }());
            Model.ViewInfo = ViewInfo;
            var ViewAuth = (function () {
                function ViewAuth() {
                }
                return ViewAuth;
            }());
            Model.ViewAuth = ViewAuth;
            var VodVideoSource = (function () {
                function VodVideoSource() {
                }
                return VodVideoSource;
            }());
            Model.VodVideoSource = VodVideoSource;
            var VideoSource = (function () {
                function VideoSource() {
                }
                return VideoSource;
            }());
            Model.VideoSource = VideoSource;
            var LiveVideoSource = (function () {
                function LiveVideoSource() {
                }
                return LiveVideoSource;
            }());
            Model.LiveVideoSource = LiveVideoSource;
            var LiveVideoSourceWebRTC = (function () {
                function LiveVideoSourceWebRTC() {
                }
                return LiveVideoSourceWebRTC;
            }());
            Model.LiveVideoSourceWebRTC = LiveVideoSourceWebRTC;
            var VariousResult = (function () {
                function VariousResult() {
                }
                return VariousResult;
            }());
            Model.VariousResult = VariousResult;
        })(Model = WebApi.Model || (WebApi.Model = {}));
    })(WebApi = Classtream.WebApi || (Classtream.WebApi = {}));
})(Classtream || (Classtream = {}));
var Classtream;
(function (Classtream) {
    var Url;
    (function (Url) {
        var Query = (function () {
            function Query() {
            }
            Query.join = function (query, name, value, isEncode) {
                if (isEncode === void 0) { isEncode = false; }
                if (Classtream.Common.isNullOrEmpty(value)) {
                    return query;
                }
                if (Classtream.Common.isReallyNaN(value)) {
                    return query;
                }
                if (Classtream.Common.isNullOrEmpty(query)) {
                    return Query.makeQuery(name, value, isEncode);
                }
                else {
                    return query + "&" + Query.makeQuery(name, value, isEncode);
                }
            };
            Query.makeQuery = function (name, value, isEncode) {
                if (isEncode === void 0) { isEncode = false; }
                if (Classtream.Common.isNullOrEmpty(value)) {
                    return null;
                }
                if (isEncode) {
                    return name + "=" + encodeURIComponent(value);
                }
                else {
                    return name + "=" + value;
                }
            };
            return Query;
        }());
        Url.Query = Query;
    })(Url = Classtream.Url || (Classtream.Url = {}));
})(Classtream || (Classtream = {}));
if (Classtream.Common.isiOS() && !Classtream.Common.isBearerAuth()) {
    Classtream.WebApi.testCookie();
}

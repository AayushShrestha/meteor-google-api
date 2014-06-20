// XXX: new version, using a vanilla, async callback style.

// TODO: migrate the promised version to wrap this.

// kill logs
// var Log = function () {}

GoogleApiAsync = {
  // host component, shouldn't change
  _host: 'https://www.googleapis.com',
  
  // Performs a GET against the google API specified by path with params
  //
  // Will retry with a refreshed token if the call appears to fail due to tokens
  get: function(path, options, callback) {
    return this._callAndRefresh('GET', path, options, callback);
  },
  
  // XXX: do I add all of these? 
  post: function(path, options, callback) {
    return this._callAndRefresh('POST', path, options, callback);
  },
  
  _callAndRefresh: function(method, path, options, callback) {
    var self = this;
    options = options || {};
        
    self._call(method, path, options,       
      // need to bind the env here so we can do mongo writes in the callback 
      // (when refreshing), if we call this on the server
      Meteor.bindEnvironment(function(error, result) {
        if (error && error.response && error.response.statusCode == 401) {
          Log('google-api attempting token refresh');

          return self._refresh(options.user, function(error) {
            if (error)
              return callback(error);
            
            self._call(method, path, options, callback);
          });
        } else {
          callback(error, result);
        }
    }, 'Google Api callAndRefresh'));
  },
  
  // call a GAPI Meteor.http function if the accessToken is good
  _call: function(method, path, options, callback) {
    Log('GoogleApi._call, path:' + path);
    
    options = options || {};
    var user = options.user || Meteor.user();
    
    if (user && user.services && user.services.google && 
        user.services.google.accessToken) {
      options.headers = options.headers || {};
      options.headers.Authorization = 'Bearer ' + user.services.google.accessToken;
    
      HTTP.call(method, this._host + '/' + path, options, function(error, result) {
        callback(error, result && result.data);
      });
    } else {
      callback(new Meteor.Error(403, "Auth token not found." +
        "Connect your google account"));
    }
  },

  _refresh: function(user, callback) {
    Log('GoogleApi._refresh');

    Meteor.call('exchangeRefreshToken', user && user._id, function(error, result) {
      callback(error, result && result.access_token)
    });
  }
}
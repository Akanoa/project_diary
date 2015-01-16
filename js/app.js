(function(){

    //-------------------------------------------------------------

    var app = angular.module('OVH Logging', ['hc.marked', 'ui.bootstrap', 'base64']);

    app.config(['markedProvider', function(markedProvider) {
      markedProvider.setOptions({gfm: true});
    }]);

    app.run(function($rootScope, $timeout){
        //set your Elasticsearch host here
        $rootScope.url = "http://46.105.173.108:8889/yguern/ovh_logging";
        $rootScope.alerts = [];
        $rootScope.edition = false;

        $rootScope.deleteAlert = function (id){
            $(".alert").fadeTo(2000, 500).slideUp(500, function(){
                $(".alert").alert('close');
            });
            if ( ~id ) $rootScope.alerts.splice(id, 1);
        };

        $rootScope.addAlert = function(type, msg){
            $rootScope.alerts.push({type: type, msg:msg});
            $timeout(function(){
                $rootScope.deleteAlert($rootScope.alerts.length - 1);
            }, 5000);
        };
    });

    app.filter('split', function() {
        return function(input, splitChar, splitIndex) {
            // do some bounds checking here to ensure it has that index
            if (splitIndex)
                return input.split(splitChar)[splitIndex];
            return input.split(splitChar);
        }
    });

    app.filter('trim', function() {
        return function trim(str) {
            return str.replace(/^\s+|\s+$/g,"");
        }
    });

    app.filter('base64', function($base64){
        return function base64(input) {
            console.log("base64");
            return $base64.encode(input);
        }
    });

    app.controller('SendCtrl', ['$rootScope', '$scope', '$http', '$q', '$filter', function ($rootScope, $scope, $http, $q, $filter) {
        $scope.text   = "";
        $scope.tags   = "";
        $scope.result = "";
        $scope.dt = null;

        $scope.sendToESPromise = /**
        * send Promise to Elastic a daily news request
        **/
        function (){
            var deffered = $q.defer();

            var params = JSON.stringify(
            {
                text : $scope.text,
                tags : $filter('split')($scope.tags, ";"),
                date : $filter("date")($scope.dt, "mediumDate")
            }
            );

            $http.post($rootScope.url, params).
                success(function(data, status, headers, config){
                    var ret = {"status":status, "short":"Journée insérée", "msg":data, "success":true};
                    deffered.resolve(ret);
                }).
                error(function (data, status, headers, config){
                    var ret = {"status":status, "short":"Un problème est survenue lors de l'insertion", "msg":data, "success":false};
                    deffered.reject("error");
                });
            return deffered.promise;
        };

        $scope.sendToES = function (){

            if ($scope.text == ""){
                $rootScope.alerts.push({type:"warning", msg:"Le texte est vide"});
                return
            }

            $scope.sendToESPromise().then(
            function(data){
                $rootScope.addAlert("success", data.short);
            },
            function(data){
                $rootScope.addAlert("danger", data.short);
            })
            .finally(function(){
                $scope.text ="";
                $scope.tags = "";
            });
        };





      $scope.today = function() {
        $scope.dt = new Date();
      };
      $scope.today();

      $scope.clear = function () {
        $scope.dt = null;
      };

      // Disable weekend selection
      $scope.disabled = function(date, mode) {
        return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
      };

      $scope.toggleMin = function() {
        $scope.minDate = $scope.minDate ? null : new Date();
      };
      $scope.toggleMin();

      $scope.open = function($event) {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.opened = true;
      };

      $scope.close_panel = function(){
        $rootScope.dt = $scope.dt;
      }

      $scope.dateOptions = {
        formatYear: 'yy',
        startingDay: 1
      };

      $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
      $scope.format = $scope.formats[0];





    }]);

    app.controller('GetCtrl', ['$rootScope', '$scope', '$http', '$q', '$filter', function ($rootScope, $scope, $http, $q, $filter) {

        $scope.data = false;

        $scope.text_tmp = "";
        $scope.tags_tmp = "";
        $scope.id_tmp = "";

        $scope.getFromESPromise = /**
        * send Promise to Elastic a daily news request
        **/
        function (){
            var deffered = $q.defer();

            $http.get($rootScope.url+'/_search').
                success(function(data, status, headers, config){
                    var ret = {"status":status, "short":"Logging récupéré", "msg":data, "success":true};
                    deffered.resolve(ret);
                }).
                error(function (data, status, headers, config){
                    var ret = {"status":status, "short":"Un problème est survenue lors de la récupération des données", "msg":data, "success":false};
                    deffered.reject(ret);
                });
            return deffered.promise;
        };

        $scope.getFromES = function (){
            $scope.getFromESPromise().then(
            function(data){
                $scope.data = data.msg.hits.hits;
            },
            function(data){
                $rootScope.addAlert("danger", data.short);
            })
            .finally(function(){

            });
        };

        $scope.deleteFromESPromise = /**
        * send Promise to Elastic a daily news request
        **/
        function (id){
            var deffered = $q.defer();

            $http.delete($rootScope.url+'/'+id).
                success(function(data, status, headers, config){
                    var ret = {"status":status, "short":"Entrée supprimée", "msg":data, "success":true};
                    deffered.resolve(ret);
                }).
                error(function (data, status, headers, config){
                    var ret = {"status":status, "short":"Un problème est survenue lors de la récupération des données", "msg":data, "success":false};
                    deffered.reject(ret);
                });
            return deffered.promise;
        };

        $scope.deleteFromES = function (id){

            if(confirm("Voulez vous vraiment supprimer cette entrée?"))
            {
                $scope.deleteFromESPromise(id).then(
                function(data){
                    $rootScope.addAlert("success", data.short);
                },
                function(data){
                    $rootScope.addAlert("danger", data.short);
                })
                .finally(function(){
                    $scope.getFromES();
                });
            }

        };

        $scope.editESevent = function (log){

            $rootScope.edition = true;
            $rootScope.id_tmp = log._id;
            $rootScope.text_tmp = log._source.text;
            $rootScope.tags_tmp = log._source.tags.join("; ");

        };

    }]);

    app.controller('EditCtrl', ['$rootScope', '$scope', '$http', '$q', '$filter', function ($rootScope, $scope, $http, $q, $filter) {

        $scope.editESPromise = /**
        * send Promise to Elastic a daily news request
        **/
        function (id){
            var deffered = $q.defer();

            params = {
                doc:
                {
                    text : $scope.text_tmp,
                    tags : $filter('split')($scope.tags_tmp, ";")
                }
            };

            $http.post($rootScope.url+'/'+id+'/_update', params).
                success(function(data, status, headers, config){
                    var ret = {"status":status, "short":"Entrée modifiée", "msg":data, "success":true};
                    deffered.resolve(ret);
                }).
                error(function (data, status, headers, config){
                    var ret = {"status":status, "short":"Un problème est survenue lors de la modification des données", "msg":data, "success":false};
                    deffered.reject(ret);
                });
            return deffered.promise;
        };

        $scope.editES = function (){

            var id = $rootScope.id_tmp;

            $scope.editESPromise(id).then(
            function(data){
                $rootScope.addAlert("success", data.short);
            },
            function(data){
                $rootScope.addAlert("danger", data.short);
            })
            .finally(function(){
                $scope.closeEdition();
            });

        };

        $scope.closeEdition = function (){
            $rootScope.edition = false;
            $rootScope.text_tmp = "";
            $rootScope.tags_tmp = "";
            $rootScope.id_tmp = "";
        };

    }]);

    app.controller('DatepickerCtrl', ['$rootScope', '$scope', function ($rootScope, $scope) {

    }]);

})();
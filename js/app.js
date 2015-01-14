(function(){

    //-------------------------------------------------------------

    var app = angular.module('OVH Logging', ['hc.marked']);

    app.config(['markedProvider', function(markedProvider) {
      markedProvider.setOptions({gfm: true});
    }]);

    app.run(function($rootScope){
        //set your Elasticsearch host here
        $rootScope.url = "http://46.105.173.108:8889/yguern/ovh_logging";
        $rootScope.alerts = [];

        $rootScope.deleteAlert = function (id){
            console.log("delete alert "+id)
            if ( ~id ) $rootScope.alerts.splice(id, 1);
        }
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

    app.controller('SendCtrl', ['$rootScope', '$scope', '$http', '$q', '$filter', function ($rootScope, $scope, $http, $q, $filter) {
        $scope.text   = "";
        $scope.tags   = "";
        $scope.result = "";
        $scope.done   = false;

        $scope.sendToESPromise = /**
        * send Promise to Elastic a daily news request
        **/
        function (){
            var deffered = $q.defer();

            var params = JSON.stringify(
            {
                text : $scope.text,
                tags : $filter('split')($scope.tags, ";"),
                date : $filter('date')(new Date(), 'medium')
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
                $rootScope.alerts.push({type:"success", msg:data.short});
            },
            function(data){
                $rootScope.alerts.push({type:"danger", msg:data.short});
            })
            .finally(function(){
                $scope.text ="";
                $scope.tags = "";
            });
        };
    }]);

    app.controller('GetCtrl', ['$rootScope', '$scope', '$http', '$q', '$filter', function ($rootScope, $scope, $http, $q, $filter) {

        $scope.data = false;
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
                    deffered.reject("error");
                });
            return deffered.promise;
        };

        $scope.getFromES = function (){
            $scope.done = false;
            $scope.getFromESPromise().then(
            function(data){
                $scope.data = data.msg.hits.hits;
            },
            function(data){
                $rootScope.alerts.push({type:"success", msg:data.short});
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
                    var ret = {"status":status, "short":"Logging récupéré", "msg":data, "success":true};
                    deffered.resolve(ret);
                }).
                error(function (data, status, headers, config){
                    var ret = {"status":status, "short":"Un problème est survenue lors de la récupération des données", "msg":data, "success":false};
                    deffered.reject(ret);
                });
            return deffered.promise;
        };

        $scope.deleteFromES = function (id){

            console.log("suppression de "+id);

            if(confirm("Voulez vous vraiment supprimer cette entrée?"))
            {
                $scope.deleteFromESPromise(id).then(
                function(data){
                    console.log(data);
                },
                function(data){
                    console.log(data);
                })
                .finally(function(){

                });
            }

        };


    }]);
})()
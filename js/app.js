(function(){

    //-------------------------------------------------------------

    var app = angular.module('OVH Logging', ['hc.marked']);

    app.config(['markedProvider', function(markedProvider) {
      markedProvider.setOptions({gfm: true});
    }]);

    app.run(function($rootScope){
        //set your Elasticsearch host here
        $rootScope.url = "http://guern.eu:9200/yguern/ovh_logging";
        $rootScope.alerts = [];
        $rootScope.edition = false;

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
            console.log("récupération des données");
            $scope.getFromESPromise().then(
            function(data){
                $scope.data = data.msg.hits.hits;
            },
            function(data){
                $rootScope.alerts.push({type:"danger", msg:data.short});
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

            console.log("suppression de "+id);

            if(confirm("Voulez vous vraiment supprimer cette entrée?"))
            {
                $scope.deleteFromESPromise(id).then(
                function(data){
                    $rootScope.alerts.push({type:"success", msg:data.short});
                },
                function(data){
                    $rootScope.alerts.push({type:"danger", msg:data.short});
                })
                .finally(function(){
                    $scope.getFromES();
                });
            }

        };


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

            var id = $scope.id_tmp;

            console.log("édition de "+id);

            $scope.editESPromise(id).then(
            function(data){
                $rootScope.alerts.push({type:"success", msg:data.short});
            },
            function(data){
                $rootScope.alerts.push({type:"danger", msg:data.short});
            })
            .finally(function(){
                $scope.getFromES();
                $scope.closeEdition();
            });

        };

        $scope.editESevent = function (log){

            console.log("édition de "+log._id);

            $rootScope.edition = true;
            $scope.id_tmp = log._id;
            $scope.text_tmp = log._source.text;
            $scope.tags_tmp = log._source.tags.join("; ");
        };

        $scope.closeEdition = function (){
            $rootScope.edition = false;
            $scope.text_tmp = "";
            $scope.tags_tmp = "";
            $scope.id_tmp = "";
        };


    }]);
})()
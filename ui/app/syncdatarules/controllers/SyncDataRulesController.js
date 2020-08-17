'use strict';

angular.module('syncdatarules')
  .controller('SyncDataRulesController', ['$scope', '$http', '$q', 'offlineDbService', 'offlineService', 'eventLogService', 'vkThread',
    function ($scope, $http, $q, offlineDbService, offlineService, eventLogService, vkThread) {
      console.log("Inside the controller");
      var self=this;

//thread.exec
      $scope.exportMetaData = function () {
        const db = new Dexie('Bahmni');
        Dexie.getDatabaseNames(function (databaseNames) {
          console.log(databaseNames.length + "  :   " + databaseNames[0]);
        });

        db.open().then(function () {
          const idbDatabase = db.backendDB(); // get native IDBDatabase object from Dexie wrapper
          // export to JSON, clear database, and import from JSON
          exportToJsonString(idbDatabase, function (err, jsonString) {
            if (err) {
              console.error(err);
            } else {
              console.log('Exported as JSON: ' + jsonString);
              var file = new Blob([jsonString], {
                type: 'application/json'
              });
              var fileURL = URL.createObjectURL(file);
              var a = document.createElement('a');
              a.href = fileURL;
              a.target = '_blank';
              a.download = $scope.selectedFile + '.json';
              document.body.appendChild(a);
              a.click();
            }
          });
        }).catch(function (e) {
          console.error('Could not connect. ' + e);
        });
        // var promises = [];
        // offlineService.isOfflineApp();
        // let isInitSync=false;
        // promises.push(syncForCategory("addressHierarchy", isInitSync));
        // promises.push(syncForCategory("parentAddressHierarchy", isInitSync));
        //
        // return $q.all(promises);
      };
      var syncForCategory = function (category, isInitSync) {
        return offlineDbService.getMarker(category).then(function (marker) {
          if (category === "encounter" && isInitSync) {
            marker = angular.copy(marker);
            marker.filters = offlineService.getItem("initSyncFilter");
          }
          return syncForMarker(category, marker, isInitSync);
        });
      };

      var syncForMarker = function (category, marker, isInitSync) {
        return eventLogService.getEventsFor(category, marker).then(function (response) {
          var events = response.data ? response.data["events"] : undefined;
          // if (events == undefined || events.length == 0) {
          //   endSync(stages++);
          //   return;
          // }
          // updatePendingEventsCount(category, response.data.pendingEventsCount);
          return readEvent(events, 0, category, isInitSync);
        }, function () {
          // endSync(-1);
          // return createRejectedPromise();
        });
      };

      var readEvent = function (events, index, category, isInitSync) {
        console.log("Reading events here ...");


      };
      $scope.import = function () {
        console.log("Entering import");
        var selfie = this;
        var thread = vkThread();
        var thread2 = vkThread();
        var thread3 = vkThread();
        var param = {
          fn: getPatientDataForFiles,
          args: ["https://192.168.33.79"+Bahmni.Common.Constants.preprocessedPatientUrl + "BAMA10-1.json.gz"],
          context:self
        };
        var param1 = {
          fn: getPatientDataForFiles,
          args: ['https://192.168.33.79'+Bahmni.Common.Constants.preprocessedPatientUrl + 'BAMA1-1.json.gz'],
          context:self
        };
        var param2 = {
          fn: getPatientDataForFiles,
          args: ['https://192.168.33.79'+Bahmni.Common.Constants.preprocessedPatientUrl + 'BAMA1-21.json.gz'],
          context:self
        };
        thread.exec(param).then(function (data) {
            console.log("Starting download of file 1");  // <-- thread returns 3
          $scope.data=data;
          },
          function (err) {
            alert(err);  // <-- thread returns error message
          });
        thread2.exec(param1).then(function (data) {
            console.log("Starting download of file 2");  // <-- thread returns 3
          },
          function (err) {
            alert(err);  // <-- thread returns error message
          });
        thread3.exec(param2).then(function (data) {
            console.log("Starting download of file 3");  // <-- thread returns 3
          },
          function (err) {
            alert(err);  // <-- thread returns error message
          });
        //getPatientDataForFiles();
      };
      var getPatientDataForFiles = function (config) {
        console.log(config.toString());
        return vkhttp(config).then(function (response) {
          var test = response;
          console.log("here in response");
          // var deferrable = $q.defer();
          // offlineDbService.getAttributeTypes().then(function (attributeTypes) {
          //   mapAttributesToPostFormat(response.data.patients[1].person.attributes, attributeTypes);
          //   mapIdentifiers(response.data.patients[1].person.identifiers).then(function () {
          //     offlineDbService.createPatient({
          //       patient: response.data.patients[1]
          //     }).then(function () {
          //       deferrable.resolve();
          //     }, function (response) {
          //       deferrable.reject(response);
          //     });
          //   });
          // });
        })
      };
      var mapAttributesToPostFormat = function (attributes, attributeTypes) {
        angular.forEach(attributes, function (attribute) {
          if (!attribute.voided && !attribute.attributeType.retired) {
            var foundAttribute = _.find(attributeTypes, function (attributeType) {
              return attributeType.uuid === attribute.attributeType.uuid;
            });
            if (foundAttribute.format === "org.openmrs.Concept") {
              var value = attribute.value;
              attribute.value = value.display;
              attribute.hydratedObject = value.uuid;
            }
          }
        });
      };

      var mapIdentifiers = function (identifiers) {
        var deferred = $q.defer();
        return offlineDbService.getReferenceData("IdentifierTypes").then(function (identifierTypesData) {
          var identifierTypes = identifierTypesData.data;
          angular.forEach(identifiers, function (identifier) {
            identifier.identifierType.primary = isPrimary(identifier, identifierTypes);
          });
          var extraIdentifiersForSearch = {};
          var extraIdentifiers = _.filter(identifiers, {
            'identifierType': {
              'primary': false
            }
          });
          var primaryIdentifier = _.filter(identifiers, {
            'identifierType': {
              'primary': true
            }
          })[0];
          angular.forEach(extraIdentifiers, function (extraIdentifier) {
            var name = extraIdentifier.identifierType.display || extraIdentifier.identifierType.name;
            extraIdentifiersForSearch[name] = extraIdentifier.identifier;
          });
          angular.forEach(identifiers, function (identifier) {
            identifier.primaryIdentifier = primaryIdentifier.identifier;
            identifier.extraIdentifiers = !_.isEmpty(extraIdentifiersForSearch) ? extraIdentifiersForSearch : undefined;
          });
          deferred.resolve({
            data: identifiers
          });
          return deferred.promise;
        });
      };

      $scope.jsonString;
      $scope.readFromFile = function () {
        if (window.FileReader) {
          var input = document.getElementById('myFile');
          var file = input.files[0];

          readFile(file, function (e) {
            $scope.jsonString = e.target.result;
            $scope.$apply();

            const db = new Dexie('Bahmni');
            db.open().then(function () {
              const idbDatabase = db.backendDB();
              // clearDatabase(idbDatabase, function (err) {
              //   if (!err) { // cleared data successfully
              //    console.log("Cleared storage.");
              //   }
              // });
              //read from file
              importFromJsonString(idbDatabase, e.target.result, function (err) {
                if (!err) {
                  console.log('Imported data successfully');
                }
              });
            });

          });
        }
      };

      function readFile(file, callback) {
        var reader = new FileReader();
        reader.onload = callback;
        reader.readAsText(file);
      }

      $scope.clearMetaData = function () {
        const db = new Dexie('metaData');
        db.open().then(function () {
          const idbDatabase = db.backendDB();
          clearDatabase(idbDatabase, function (err) {
            if (!err) { // cleared data successfully
              console.log("Cleared storage.");
            }
          });
        });
      };

      $scope.estimate = function () {
        console.log("Entering estimate");
        $scope.noEventsMessage = "";
        $http.get(Bahmni.Common.Constants.preprocessedPatientUrl + "BAMA10-1.json.gz").then(function (response) {
          if (response.data.patients.length > 0) {
            $scope.noEvents = false;
            $scope.events = response.data.patients.length;
          } else {
            $scope.noEvents = true;
          }
        });
      };
    }
]);

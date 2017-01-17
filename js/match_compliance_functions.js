function login(inputFile) {
    var fileUpload = document.getElementById(inputFile);
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    var reader = new FileReader();
    reader.readAsText(fileUpload.files[0]);
    reader.onload = function(event) {
        var csv = event.target.result;
        var key = Papa.parse(csv).data;
        
        var config = {
            apiKey: key[0][1],
            authDomain: key[1][1],
            databaseURL: key[2][1],
            storageBucket: key[3][1]
        };
        firebase.initializeApp(config);
        
        firebase.auth().signInWithEmailAndPassword(username, password).catch(function(error){
            var errorCode = error.code;
            var errorMessage = error.message;
            alert("error code: "+ errorCode + "; error message: " + errorMessage);
        }).then(function(){
            firebase.database().ref().child("NOTES").child("MATCH").child("LIST").once('value').then(function(roster) {
                $(function() {
                    alert("You have successfully logged in");
                    userList = Object.keys(roster.val());
                    console.log(userList);
                    $( "#subjectList" ).autocomplete({source: userList});
                });
            });
            document.getElementById("subjectSelection").style.display = "block";
        });
    }
}

function checkCompliance() {
    var id = document.getElementById("subjectList").value.replace(/.com/g, "_com");
    firebase.database().ref().child("NOTES").child("MATCH").child(id).once('value').then(function(snapshot) {
        outputX = personCompliance(snapshot.val());
        totalX = totalCompliance(outputX);
        
        $(document).ready(function(){
            $("#indivTotalCompliance").DataTable({
                paging: false,
                retrieve: true,
                "columns": [
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" }
                ]
            });
        });
        $("#indivTotalCompliance").dataTable().fnClearTable();
        $("#indivTotalCompliance").dataTable().fnAddData(totalX);
        
        $(document).ready(function(){
            $("#indivDayCompliance").DataTable({
                paging: true,
                retrieve: true,
                "columns": [
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" },
                    {className: "dt-body-center" }
                ]
            });
        });
        $("#indivDayCompliance").dataTable().fnClearTable();
        $("#indivDayCompliance").dataTable().fnAddData(outputX);
        
        document.getElementById("complianceTable").style.display = "block";
    });
}

function totalCompliance(person) {
    var total = ["", 0, 0, 0, 0, 0];
    for (var i=0; i<person.length; i++) {
        if (person[i][2]!=0) {
            total[0] = person[i][2];
        }
        total[1] = total[1]+person[i][3];
        total[2] = total[2]+person[i][4];
        total[4] = total[4]+person[i][6];
        total[5] = total[5]+person[i][7];
    }
    total[3] = (total[2]/total[1]*100).toFixed(2) + "%";
    return [total];
}

function personCompliance(note, ncol=8) {
    var personX = [];
    // ncol is the default number of columns in the compliance table
    var dates = [];
    Object.keys(note).forEach(function(item){
        if (/[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(item)) {dates.push(item)}
    });
    
    if (dates.length<1) {
        alert ("No data on the selected participant");
    } else {
        for (var i=0; i<dates.length; i++) {
            if (note[dates[i]]["Survey"]==null) {
                personX.push(fillDayX(dates[i], 0, ncol)); //no surveys
            } else {
                if (note[dates[i]]["Survey"]["Complete"]==null) {
                    personX.push(fillDayX(dates[i], 0, ncol)); //no surveys
                } else {
                    promptX = note[dates[i]]["Survey"]["Complete"];
                    personX.push(dayCompliance(dates[i], ncol, promptX));
                }
            }
        }
        return personX;
    }
    
    function dayCompliance(date, ncol, prompts) {
        var sumX = {id:[], dates:[]};
        var promptList = Object.keys(prompts);
        if (promptList.length==0) {
            return fillDayX(dates[i], 0, ncol-1); //surveys without prompts
        } else {
            var dayEma = 0, daySal = 0;
            var dayAnsEma = 0, dayAnsSal = 0;
            for (var j=0; j<promptList.length; j++) {
                sumX.id.push(prompts[promptList[j]][0]);
                sumX.dates.push(prompts[promptList[j]][4]);
                if (/EMA/gi.test(prompts[promptList[j]][1])) {
                    dayEma++;
                    if (/Completed/gi.test(prompts[promptList[j]][3])) {dayAnsEma++}
                }
                if (/SALIVA/gi.test(prompts[promptList[j]][1])) {
                    daySal++;
                    if (/Completed/gi.test(prompts[promptList[j]][3])) {dayAnsSal++}
                }
                
            }
            var dayX = [date]; // Date
            dayX.push(unique(sumX.dates).join("|")); // Survey Date
            dayX.push(unique(sumX.id).join("|")); //subject id
            dayX.push(dayEma); //#EMA
            dayX.push(dayAnsEma);
            dayX.push((dayAnsEma/dayEma*100).toFixed(2) + "%");
            dayX.push(daySal);
            dayX.push(dayAnsSal);
            return dayX;
        }
        
    }
    
    // output empty array with given length
    function fillDayX(date, value, len) {
        var arr = [date];
        for (var i=0; i<len-1; i++) { // the first cell is the date
            arr.push(value);
        }
        return arr;
    }
}

// return unique values
function unique(list) {
  var result = [];
  $.each(list, function(j, e) {
    if ($.inArray(e, result) == -1) result.push(e);
  });
  return result;
}


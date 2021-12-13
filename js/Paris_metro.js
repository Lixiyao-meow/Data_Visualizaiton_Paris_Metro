var stations;
var lines;
var linesGroup, stationsGroup, nameGroupe;
var path;
var map;
var svg;
var rootWidth, previousWidth;
var radius;
var featureLine, featureStation, featureName;
var visitors;

var createViz = function(){
    var year = document.querySelector('#SelectYear').value;
    loadData(year);
};

var loadData = function(year){
    const promise1 = d3.json("data/stations.json");
    const promise2 = d3.json("data/lines.json");
    const promise3 = d3.json("data/" + year + ".geojson");

    Promise.all([promise1, promise2, promise3]).then(function(data){
        stations = data[0];
        lines = data[1];
        visitors = data[2];
        
        //add latitude and longititude to visitors number
        for(var i=0; i < visitors.features.length; i++){
            var name = visitors.features[i].properties.Station;
            
            visitors.features[i].properties.ID = null;
            visitors.features[i].properties.COLORS = "#B8B8B8";
            for(var j=0; j < stations.features.length; j++){
                if( stations.features[j].properties.STATION == name){
                    visitors.features[i].properties.ID = stations.features[j].properties.ID;
                    visitors.features[i].properties.COLORS = stations.features[j].properties.COLORS;
                    visitors.features[i].geometry = stations.features[j].geometry;
                }
            }
        }
        //console.log(stations);
        createMap();
    });
};

var createMap = function(){
    if(map != null)
        map.remove();

    var myLayer = L.tileLayer('http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        minZoom: 2,
		maxZoom: 16
	});
   
	map = new L.Map("map", {
		zoomControl: true,
        center: new L.LatLng(48.858, 2.333),
		zoom: 13,
		layers: [myLayer],
	});

	svg = d3.select(map.getPanes().overlayPane).append("svg");
    linesGroup = svg.append("g").attr("class", "leaflet-zoom-hide");
    stationsGroup = svg.append("g").attr("class", "leaflet-zoom-hide");	
	nameGroupe = svg.append("g").attr("class", "leaflet-zoom-hide");

	var transform = d3.geoTransform({point: projectPoint});
	path = d3.geoPath().projection(transform);
	
	addStation(visitors);
    addLine(lines);
    addStationName(stations);
    
    map.on("viewreset", reset());
    map.on("zoomend",function(){
        reset();
    });
};

var addStation = function(station_data){
	radius = d3.scaleLinear()
			        .domain([0, d3.max(station_data.features, function(d) {return + d.properties.TRAFIC;})])
			        .range([2, 1000]);

	featureStation = stationsGroup.selectAll(".station")
	.data(station_data.features)
	.enter()
    .append("path")
	.attr("class", "station")
	.attr("id", function(d){ return "s" + d.properties.ID; })
	.attr("d", path.pointRadius(function(d) {return Math.sqrt(radius(d.properties.TRAFIC))}))
	.style("fill", function(d) { return (d.properties.COLORS.indexOf('-') > 0 ? "#B8B8B8" : d.properties.COLORS); })
	.style("z-index", function(d){ return Math.floor(50 - (d.properties.TRAFIC / 1000000)); })
	.style("opacity", function(d) { return (d.properties.COLORS.indexOf('-') > 0 ? "0.7" : "1"); });
};

var addStationName = function(stations){
    featureName = nameGroupe.selectAll(".name")
        .data(stations.features)
        .enter()
        .append("text")
        .attr('x', function(d){return path.centroid(d)[0];})
        .attr('y', function(d){return path.centroid(d)[1];})
        .attr("id", function(d){ return d.properties.STATION; })
        .attr('text-anchor','middle')
        .style("font", "6px sans-serif")
        .text(function(d) {return d.properties.STATION;});
}

var addLine = function(lines){
    featureLine = linesGroup.selectAll(".line")
	    .data(lines.features)
		.enter()
		.append("path")
		.attr("class", "line")
		.attr("id", function(d) { return "l" + d.properties.LINE;})
		.attr("d", path)
		.style("stroke", function(d) { return d.properties.COLOR;});    
}

// Define a projection from latLng to pixel coordinates
var projectPoint = function(x, y) {
	var point = map.latLngToLayerPoint(new L.LatLng(y, x));
	this.stream.point(point.x, point.y);
};

// Reposition the SVG to cover the features and fit with zoom
var reset = function(){
    var bounds = path.bounds(visitors);
    var topLeft = bounds[0];
    var bottomRight = bounds[1];

    svg.attr("width", bottomRight[0] - topLeft[0])
       .attr("height", bottomRight[1] - topLeft[1])
       .style("left", topLeft[0] + "px")
       .style("top", topLeft[1] + "px");

    linesGroup.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
    stationsGroup.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
    nameGroupe.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    featureLine.attr("d", path);

    //adjust radius and font size to zoom scale
    if (rootWidth === undefined) { // rootWidth means max range for stations radius = 50
        rootWidth = bottomRight[0] - topLeft[0];
        previousWidth = rootWidth;
    }
    
    var newWidth = bottomRight[0] - topLeft[0];
    if (previousWidth != newWidth) {
        radius.range([2, 1000 * (newWidth / rootWidth)]);
    }
    
    featureStation.attr("d", path.pointRadius(function(d) {return Math.sqrt(radius(d.properties.TRAFIC)) }));
    
    featureName.attr('x', function(d){return path.centroid(d)[0];})
               .attr('y', function(d){return path.centroid(d)[1];})
               .style("font", function(d){return Math.floor(6 * Math.sqrt(newWidth / rootWidth)) + "px sans-serif"; });

    previousWidth = newWidth;

};
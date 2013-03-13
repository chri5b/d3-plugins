(function() {

// inspired by http://www-958.ibm.com/software/data/cognos/manyeyes/page/Word_Tree.html 
// derived from http://mbostock.github.com/d3/talk/20111018/tree.html

d3.wordtree = function(){
    var margins = [20,20,20,20],
        width = 600,
        height = 200,
        textSizeMultiplier = width/2000,
        maxSize = 0,
        treeData = [],
        onClick = function(d) {},
        mouseoverText = function(d) { return d.name;},
        maxDepth = 20;


    function my(selection) {
        if (selection) {
            selection.each(function(d,i) {

                var targetElementId = this.id;
                var targetElement = d3.select("#" + targetElementId);

                my.treeData([]);

                if(d3.select("#" + targetElementId + "-svg")[0][0] == null){
                    var svgElement = targetElement.append("svg:svg").attr("id",targetElementId + "-svg");

                    svgElement.append("svg:g").attr("id", targetElementId + "-vis");
                }

                var d3TreeLayout = d3.layout.tree();

                d3TreeLayout.size([my.height(), my.width()/2]);

                d3.select("#" + targetElementId + "-svg")
                    .attr("width", my.width() - (my.margins()[1] + my.margins()[3])+'px')
                    .attr("height", (my.height() - (my.margins()[0] + my.margins()[2])) + 'px');

                d3.select("#" + targetElementId + "-vis")
                    .attr("transform", "translate(" + (((my.width())/2) + my.margins()[1]) + "," + my.margins()[0] + ")");

                my.treeData(d);

                my.maxSize(treeData.value);

                var vis = d3.select("#" + targetElementId + "-vis")
                vis.empty();
                d3TreeLayout.size([my.height() - (my.margins()[0] + my.margins()[2]), my.width()/2 - (my.margins()[1] + my.margins()[3])]);
                update(treeData,vis,d3TreeLayout);

            });
        }
    }
 
    // DISPLAY CONFIG
    my.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        textSizeMultiplier = value/2000;
        return my;
    };

    my.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return my;
    };  
  
    //array containing pixel widths for margins
    my.margins = function(value) {
        if (!arguments.length) return margins;
        margins = value;
        return my;
    }

    //Maximum depth of tree to render
    my.maxDepth = function(value) {
        if (!arguments.length) return maxDepth;
        maxDepth = value;
        return my;
    };



    // INTERACTION CONFIG
    // specifies the text which should appear in the mouseover
    my.mouseoverText = function(value) { 
        if (!arguments.length) return mouseoverText;
        mouseoverText = value;
        return my;
    };
 
    //function to be called when user clicks on a word in the diagram (can be used to re-request data and display a new wordTree for the selected word)
    my.onClick = function(value) {
        if (!arguments.length) return onClick;
        onClick = value;
        return my;
    }

    //INTERNALS
    //not intended for use by clients - stores the maximum value on the tree
    my.maxSize = function(value) {
        if (!arguments.length) return maxSize;
        maxSize = value;
        return my;
    };

    my.textSizeMultiplier = function(value) {
        if (!arguments.length) return textSizeMultiplier;
        textSizeMultiplier = value;
        return my;
    }
  
    my.treeData = function(value) {
        if (!arguments.length) return treeData;
        treeData = value;
        return my;
    }

    return my;












    function update(source,visualisation,d3TreeLayout) {

        // Set vertical alignment of tree in the middle of the screen
        source.x0 = my.height() / 2;
        source.y0 = 0;
      
        // Set duration for transitions
        var duration = 500;

        var treeData = prepareTreeData(d3TreeLayout,source);
        
        // use d3 to bind all the svg g elements which have the 'node' class to the tree data
        var d3NodeData = visualisation.selectAll("g.node")
                .data(treeData, function(d) { return d.id || (d.id = ++nodeIDCounter); });

        drawNodes(d3NodeData,source,duration);

        // Use d3 to bind all the svg path elements which have the 'link' class to the tree link data
        var d3LinkData = visualisation.selectAll("path.link")
                .data(d3TreeLayout.links(treeData), function(d) { return d.target.id; });

        drawLinks(d3LinkData,duration,source);

        // Stash the old positions for transition.
        d3NodeData.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
        });
    }

    function prepareTreeData(tree,source) {
         // Compute the new tree layout.
        var nodes = tree.nodes(source).reverse();
        var rootNode = getRoot(nodes[0]);
        // Calculate width required for each level of depth in the graph
        var depthWidths = []; // For each level of depth in the tree, stores the maximum pixel width required
        var searchTermWidth = 0;
        nodes.forEach(function(d) {
            var widthForThisNode = getTextWidth(d.cleanName,d.value);
            if(depthWidths[d.depth]) {
                if (depthWidths[d.depth] < widthForThisNode) {
                    depthWidths[d.depth] = widthForThisNode;
                }
            }
            else {
                depthWidths[d.depth] = widthForThisNode;
            }
        }); 
        
        searchTermWidth = getTextWidth(rootNode.cleanName,my.maxSize()); //How many pixels does the word searched for (in the middle of the tree) take up?
        
        spaceForTree = getSpaceForTree(searchTermWidth);
        
        depthWidths = adjustDepthsForAvailableSpace(depthWidths, spaceForTree);
        
        // Set the horizontal position for each node. Set vertical position for root node in the middle of the available space.
        nodes.forEach(function(d) {
                //If the node is deeper in the tree than maxDepth then delete it.
                if(d.depth > my.maxDepth()) {
                    d.visible = false; 
                } else {
                    d.y = getYPosition(d,searchTermWidth,depthWidths);
                    d.visible = true;
                    if(d.depth==0) {
                        d.x = my.height()/2;
                    }
                }
        });
        
        nodes = nodes.filter(function(d) {
            return d.visible != false;
        });

        return nodes;
    }
    
    function adjustDepthsForAvailableSpace(depthWidths, spaceForTree) {
        //We need to try to fit the available content in the space available
        //Given the maxDepth we need to plot, can we fit it in the available space?
        var maxDepth = my.maxDepth()
        var requiredSpace = 0;
        for (var i = 0; i < Math.min(maxDepth,depthWidths.length); i++) {
            requiredSpace += depthWidths[i];
        }
        
        var availableSpaceUsed = requiredSpace/spaceForTree;

        if(availableSpaceUsed <= 1) {
            // If we have more space than we need, nothing needs to be done
        } 
        else if (availableSpaceUsed > 1) {
            // If we just need to squeeze things up a bit, then do it
            for (var i = 0 ; i < Math.min(maxDepth,depthWidths.length); i++) {
                // reduce the available space
                depthWidths[i] = depthWidths[i]/availableSpaceUsed;
            }
            // reduce the textSizeMultiplier so we actually need less space   
            my.textSizeMultiplier(my.textSizeMultiplier()/availableSpaceUsed);
        } 
        
        return depthWidths;    
    }

    function getNodeById(id,node) {
        if (node.id==id) { 
            return node; 
        }
        else {
            for(var i = 0; i<node.children.length; i++) {
                var possibleResponse = getNodeById(id,node.children[i]);
                if (possibleResponse != false) {
                    return possibleResponse;
                }
            }
        }
        return false;
    }

    function getRoot(node) {
        //recursively climbs the tree until it gets to the root node and returns it.
        if(node) {
            if(node.depth == 0) {
                return node;
            }
            else {
                return getRoot(node.parent);
            }
        }
        return false;
    }

    function getFontSize(thisSize){
        return (Math.sqrt(( thisSize/my.maxSize() ) * 800 * my.textSizeMultiplier() ))+8;

    }

    function getTextWidth(text,thisSize) {
        var marginForCircle = 20;
        var font = getFontSize(thisSize) + "px Helvetica";	
        //Create a hidden div with the content and measure its width
        //TODO replace this with something which doesn't depend on jQuery.
        /*
        var o = $('<div>' + text + '</div>')
                    .css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden', 'font': font})
                    .appendTo(d3.select('body')),
            width = o.width();

        o.remove();
        */
        var width = 50;
        return width + marginForCircle;
    }

    function getYPosition(d,searchTermWidth,depthWidths) {

        var yPosition = 0;
            for (var i = d.depth ; i > 0; i--) {
                    yPosition += depthWidths[i];
            }

            return yPosition;

    }
    
    function getSpaceForTree (searchTermWidth) {
        var margins = my.margins();
        var availableSpace = my.width() - (margins[1] + margins[3])
        var spaceForTree = (availableSpace - searchTermWidth)/2;
        return spaceForTree;
    }

    function drawNodes(d3NodeData,source,duration) {
        addNewNodes(d3NodeData,source);
        transitionExistingNodes(d3NodeData);
        removeOldNodes(d3NodeData,duration,source);
    }

    function drawLinks(d3LinkData,duration,source) {

        addNewLinks(d3LinkData,duration,source);
        transitionExistingLinks(d3LinkData,duration);
        removeOldLinks(d3LinkData,source,duration);

    }

    function addNewNodes(nodes,source) {
        
        //Add an svg group with the interactive behaviour and the appropriate position
        var onClickBehaviour = my.onClick();
        var mouseoverText = my.mouseoverText();
        
        var nodeEnter = nodes.enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .on("click", onClickBehaviour);
        
        //Add the circle
        nodeEnter.append("svg:circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
        
        //Add the text at the appropriate position, size and drag behaviour. id is used to find and highlight the node during drag
        nodeEnter.append("svg:text")
                .attr("x", 10)
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .attr("font-size",function(d) { return getFontSize(d.value,my.maxSize(),my.textSizeMultiplier())})
                .attr("opacity",function(d) { return Math.sqrt(d.value/my.maxSize())>0.25 ? 1 : 0.5 })
                .attr("id", function(d) { return (d.depth == 0 ? "rootnode" : "post-" + d.id); })
                .text(function(d) { return getNodeText(d);})
                .style("fill-opacity", 1e-6)
            .append("svg:title")
                .text(mouseoverText);
    }

    function getNodeText(d) {
        var result = "";
        var name = "";
        if (d.pluralAndSingular) { //If we have plural and singular forms on the same branch (i.e. ball and balls) then we should show ball(s)
            name = d.ambiguousName;
        } else {
            name = d.cleanName;
        }
        name = name.replace(/_/g,' '); //substitute any underscores with spaces (for multi-word search terms)
        result = name;

        return result;
    }
    
    function transitionExistingNodes(nodes,duration) {

        // Transition nodes to their new position.
        var nodeUpdate = nodes.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        //Add the circle   
        nodeUpdate.select("circle")
                .attr("r", function(d) { if(my.textSizeMultiplier() > 0.5) { return 4.5; } else {return 0;}} )
                .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; })
                .style("stroke", function(d) { return d.cleanName == "" ? "#fff" : "steelblue"; });

        nodeUpdate.select("text")
                .attr("font-size",function(d) { return (((Math.sqrt(d.value/ my.maxSize() *800)))* my.textSizeMultiplier() )+8;})
            .style("fill-opacity", 1);
    }

    function removeOldNodes(nodes,duration,source) {
        
        // Transition exiting nodes to the parent's new position.
        var nodeExit = nodes.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                .remove();

        // transition the circle to 0 radius
        nodeExit.select("circle")
                .attr("r", 1e-6);

        // fade out the text
        nodeExit.select("text")
                .style("fill-opacity", 1e-6);
    }

    function addNewLinks(d3LinkData,duration,source) {

        // Enter any new links at the parent's previous position.
        d3LinkData.enter().insert("svg:path", "g")
                .attr("class", "link")
                .attr("opacity", function(d) { return d.target.cleanName == "" ? 0 : 0.2; })
                .attr("id",function(d) { return "link-" + d.target.id; })
                .attr("d", function(d) {
                    var o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                })
                .attr("stroke-width",function(d) { return (Math.sqrt(d.target.value/my.maxSize()*1000)); })
                .transition()
                    .duration(duration)
                    .attr("d", diagonal);
    }

    function transitionExistingLinks(d3LinkData,duration) {
        
        // Transition links to their new position.
        d3LinkData.transition()
                .duration(duration)
                .attr("d", diagonal);
    }

    function removeOldLinks(d3LinkData,source,duration) {

        // Transition exiting nodes to the parent's new position.
        d3LinkData.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                })
                .remove();
    }

}



    var userDragging = false;

    var nodeIDCounter = 0;

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });
        
})();
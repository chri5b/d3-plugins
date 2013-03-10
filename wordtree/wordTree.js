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
        nameAccessor = function(d) { return d.name;},
        valueAccessor = function(d) { return d.value;},
        onClick = function(d) {},
        mouseoverText = function(d) { return d.name;},
        maxResults = 40,
        maxDepth = 20;

    function my(selection) {
        selection.each(function(d,i) {
        
            var targetElementId = this.id;
            var targetElement = d3.select("#"+targetElementId);

            my.treeData([]);

            if(d3.select("#" + targetElementId + "svg").length == 0){
                var svgElement = targetElement.append("svg:svg").attr("id",targetElementId + "svg");

                svgElement.append("svg:g").attr("id", targetElementId + "vis");
            }
            
            var d3TreeLayout = d3.layout.tree();
            
            d3TreeLayout.size([my.height(), my.width()/2]);
        
            d3.select("#" + targetElementId + "svg")
                .attr("width", my.width() - (my.margins()[1] + my.margins()[3])+'px')
                .attr("height", (my.height() - (my.margins()[0] + my.margins()[2])) + 'px');
            
            d3.select("#" + targetElementId + "vis")
                .attr("transform", "translate(" + (((my.width())/2) + my.margins()[1]) + "," + my.margins()[0] + ")");
                
            var relevantData = extractRelevantData(d);

            createTree(relevantData,searchTerm,function(error,errorText,treeData,d) {
                my.treeData(treeData);

                my.maxSize(treeData.value);

                var vis = d3.select("#" + targetElementId + "vis")
                vis.empty();
                d3TreeLayout.size([my.height() - (my.margins()[0] + my.margins()[2]), my.width()/2 - (my.margins()[1] + my.margins()[3])]);
                update(treeData,vis,d3TreeLayout);

            });
        });
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
  
    //specifies the term to be displayed at the centre of the diagram
    my.searchTerm = function(value) {
        if (!arguments.length) return searchTerm;
        searchTerm = value;
        return my;
    }
  
    //maximum number of phrases to display
    my.maxResults = function(value) {
        if (!arguments.length) return maxResults;
        maxResults = value;
        return my;
    }
  
    //maximum number of words away from the central word to display
    my.maxDepth = function(value) {
        if (!arguments.length) return maxDepth;
        maxDepth = value;
        return my
    }
  
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
  
    //function to be called when user has stopped dragging
    my.onDragEnd = function(value) {
        if (!arguments.length) return onDragEnd;
        onDragEnd = value;
        return my;
    }
  
    //DATA ACCESS CONFIG
    //function to be used to retrieve the phrase text from the data provided
    my.nameAccessor = function(value) {
        if (!arguments.length) return nameAccessor;
        nameAccessor = value;
        return my;
    }
  
    //function to be used to retrieve the value from the data provided - this is used to scale the text
    my.valueAccessor = function(value) {
        if (!arguments.length) return valueAccessor;
        valueAccessor = value;
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
  
    my.preTreeData = function(value) {
        if (!arguments.length) return preTreeData;
        preTreeData = value;
        return my;
    }
  
    my.postTreeData = function(value) {
        if (!arguments.length) return postTreeData;
        postTreeData = value;
        return my;
    }

    return my;

    function createTree(matchingTerms, searchTerm, callback) {
        //partially covered in qUnit
        var tree = [];
        var treeData = [];
        var error = false;
        var errorText = "";
        
        if (searchTerm.indexOf(' ') != -1) {
            handleSpacesInMultiWordSearchTerm(searchTerm,matchingTerms)
            searchTerm = searchTerm.replace(/ /g,"_");
        }
        
        processTreeData(matchingTerms,searchTerm,treeData);

        tree = nestTreeData(treeData,searchTerm);
        if (tree == undefined) {
            error=true;
            errorText="Failed to process treeData";
        }
        
        callback(error,errorText,tree,matchingTerms);
    }
    
    function extractRelevantData(inputData) {
        var extractedData = [];
        var iteratorLimit = Math.min(inputData.length,my.maxResults());
        var nameAccessFunction = my.nameAccessor();
        var valueAccessFunction = my.valueAccessor();
        
        for(var i = 0 ; i < iteratorLimit ; i++ ) {
            var newItem = {};
            newItem.name = nameAccessFunction(inputData[i]);
            newItem.value = valueAccessFunction(inputData[i]);
            extractedData.push(newItem);
        }
        return extractedData;
    }
        
    function handleSpacesInMultiWordSearchTerm(searchTerm,matchingTerms){
        //covered in qUnit    
        //If the search term has spaces in, we want to replace them with underscores because our logic to 
        //  ensure the search term is at the root of all the trees depends on splitting terms by space.
        var originalSearchTerm = searchTerm;
        searchTerm = searchTerm.replace(/ /g,'_');

        var re = new RegExp(originalSearchTerm,"gi")
        
        for(var i=0;i<matchingTerms.length;i++) {
            if(matchingTerms[i]) {
                //replace every instance of the old search term eg "droit constitutionnel" with "droit_constitutionnel"
                matchingTerms[i].name = matchingTerms[i].name.replace(re,searchTerm);
            }
        }
    }
        
    function processTreeData(matchingTerms,searchTerm,postTreeData,preTreeData) {
        //covered in qUnit
        //We're going to draw two trees, so we need two sets of data, one for the tree which precedes the search term, one for the tree which follows it.
        //We also prune the phrases, lowercase them, and remove trailing punctuation.
        //input (ignoring value)
        //  searchTerm: 		tennis
        //  matchingTerms[0]: 	tennis ball - goes straight into post tree
        //  matchingTerms[1]: 	bouncy, tennis ball - goes into both trees but needs to be pruned each way
        //  matchingTerms[2]: 	all I want is Tennis! - goes into pre-tree, but needs to be reversed because both trees expects the search term to be the first word
        //output (ignoring value)
        //  postTreeData :		[['tennis','ball'],['tennis','ball']]
        //  preTreeData :		[['tennis','bouncy'],['tennis','is','want','i','all']]

        for(var i = 0; i < matchingTerms.length ; i++) {
            if(matchingTerms[i]) {
                matchingTerms[i].cleanName = matchingTerms[i].name.toString().split(' ');
                for(var j = 0 ; j< matchingTerms[i].cleanName.length ; j++) {
                    matchingTerms[i].cleanName[j] = removeTrailingPunctuation(matchingTerms[i].cleanName[j]);
                } 

                //If the last word isn't the search term then put it into pre-Tree
                if(lastWordIsNotSearchTerm(matchingTerms[i].cleanName,searchTerm)) {
                    var preTerm = createTerm(matchingTerms[i],i,searchTerm,false);
                    postTreeData.push(preTerm);
                }
                //If the first word isn't the search term, then put it into post-Tree 
                if(firstWordIsNotSearchTerm(matchingTerms[i].cleanName,searchTerm)) {
                    var postTerm = createTerm(matchingTerms[i],i,searchTerm,true);
                    preTreeData.push(postTerm);
                } 
            }
        }
    }

    function createTerm(matchingTerm,matchingTermIndex,searchTerm,isPost) {
        //covered by qUnit
        //assumes cleaned and lowercase terms
        var newTerm = {};
        newTerm.name=matchingTerm.name
        newTerm.cleanName =matchingTerm.cleanName.slice(0);
        if(isPost) {newTerm.cleanName.reverse();}
        newTerm.cleanName= pruneTerm(newTerm.cleanName,searchTerm);
        newTerm.value=matchingTerm.value;
        newTerm.matchingTermIndex=matchingTermIndex;
        return newTerm;
    }

    function nestTreeData(inputData,searchTerm) {
        //covered by qUnit
        //assuming pruned and cleaned input data with name as an array of words making up the phrase
        var result = [];
        
        //for each matching term, make a data tree
        for(var i=0;i<inputData.length;i++) {
            result[i] = new DataTree(inputData[i].name, inputData[i].cleanName, inputData[i].value, inputData[i].matchingTermIndex,0,my.maxDepth());
        }
        
        //merge all the data trees together (unless there's only one result)
        var mergedTree;
        if(result.length > 1)
            {
            for(var i=1;i<result.length;i++) {
              mergedTree = mergeTrees(result[0],result[i]);  
            }
            return mergedTree;
        }
        return result[0];
    }

    function lastWordIsNotSearchTerm(wordArray,searchTerm) {
        //covered by qUnit
        return wordIsNotSearchTerm(wordArray,searchTerm,false);
    }

    function firstWordIsNotSearchTerm(wordArray,searchTerm) {
        //covered by qUnit
        return wordIsNotSearchTerm(wordArray,searchTerm,true);
    }

    function wordIsNotSearchTerm(wordArray,searchTerm,first) {
        //covered by qUnit
        var wordIndex;
        if (first==true) {
            wordIndex = 0;
        } else {
            wordIndex = wordArray.length-1;
        }
        
        if (searchTerm) {
            cleanedSearchTerm = removeTrailingPunctuation(searchTerm)
            var word = removeTrailingPunctuation(wordArray[wordIndex]);
            if(word == cleanedSearchTerm) {
                return false;
            }
            var pluralForm = cleanedSearchTerm + 's';
            if(word == removeTrailingPunctuation(pluralForm)) {
                return false;
            }
            if(cleanedSearchTerm.charAt(cleanedSearchTerm.length-1) == 's') { //if the last letter of the search term is 's' then check to see if the word matches without the 's'
                singlularCleanedSearchTerm = cleanedSearchTerm.substr(0,cleanedSearchTerm.length-1);
                if(word == singlularCleanedSearchTerm) {
                    return false;
                }
            }
        }
        return true;
    }

    function removeTrailingPunctuation(word) {
        //covered by qunit
        if(word != null) {
            return word.replace(/[?:!.,;']*$/,"").toLowerCase();
        }
        return null;
    }

    function pruneTerm(wordArray,searchTerm) {
        //covered by qunit
        //delete words at the front of the expression if they don't match the search term
        //necessary because both the pre and the post tree have expressions where the search term is in the middle.
        
        while(wordIsNotSearchTerm(wordArray,searchTerm,true)) {
            if (wordArray.length == 0) {break;}
            wordArray.shift();
        }
        return wordArray;
    }	

    function mergeTrees(tree1,tree2) {
        //covered by qunit
        result = tree1;
        tree1.value = (+tree1.value) + (+tree2.value);
        tree1.matchingTermIndex = tree1.matchingTermIndex + "," + tree2.matchingTermIndex;
        for (var i=0;i<tree2.children.length;i++) {
            commonChild = tree1.getChildIndex(tree2.children[i].cleanName)
            if (commonChild != -1)
                {
                    tree1.children[commonChild] = mergeTrees(tree1.children[commonChild],tree2.children[i]);
                }
            else
                {
                    tree1.children.push(tree2.children[i]);
                }
        }
        return tree1;
    }

    function update(source,preOrPost,visualisation,d3TreeLayout) {

        // Set vertical alignment of tree in the middle of the screen
        source.x0 = my.height() / 2;
        source.y0 = 0;
      
        // Set duration for transitions
        var duration = 500;

        var treeData = prepareTreeData(d3TreeLayout,source,preOrPost); 
        
        // use d3 to bind all the svg g elements which have the 'node' class to the tree data
        var d3NodeData = visualisation.selectAll("g.node")
                .data(treeData, function(d) { return d.id || (d.id = ++nodeIDCounter); });

        var dragBehaviour = defineDragBehaviour(preOrPost);

        drawNodes(d3NodeData,preOrPost,dragBehaviour,source,duration);

        // Use d3 to bind all the svg path elements which have the 'link' class to the tree link data
        var d3LinkData = visualisation.selectAll("path.link")
                .data(d3TreeLayout.links(treeData), function(d) { return d.target.id; });

        drawLinks(d3LinkData,preOrPost,duration,source);

        // Stash the old positions for transition.
        d3NodeData.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
        });
    }

    function prepareTreeData(tree,source,preOrPost) {
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
                    d.y = getYPosition(d,searchTermWidth,depthWidths,preOrPost);
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

    function testForCommonExpressionIndices(thisNodeTermIndices,matchingTermIndices) {
        //covered by qUnit
        var thisNodeTermIndexArray = thisNodeTermIndices.split(",");
        var matchingNodeTermIndexArray = matchingTermIndices.split(",");
        var matchFound = false;
        
        for(var i = 0; i < thisNodeTermIndexArray.length ; i++) {
            for(var j = 0 ; j < matchingNodeTermIndexArray.length ; j++) {
                if (thisNodeTermIndexArray[i]==matchingNodeTermIndexArray[j]) {
                    matchFound = true;
                    break;
                }
            }
        }
        return matchFound;
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
    
    function getNodeFromBothTrees(id) {
        var preRoot = getRoot(getTreeData("pre"));
        var postRoot = getRoot(getTreeData("post"));
        var result = false
        if (preRoot) {
            result = getNodeById(id,preRoot);
        }
        if (result==false && postRoot){
            result = getNodeById(id,postRoot);
        }
        return result;
    }
    

    function getLeafArray(node,leafArray,firstTime,preOrPost) {
        
        if(firstTime) {
            if(node == getRoot(node)){
                //collect leaves from both trees because the user selected the central word
                var otherTreeData = getTreeData(getOther(preOrPost));
                if(otherTreeData) {
                    var otherTreeRoot = getRoot(otherTreeData);
                    leafArray.concat(getLeafArray(otherTreeRoot,leafArray,false,getOther(preOrPost))); //watch out for potential infinite loop here
                }
            } else {
                //we want the user to be able to select any node on each tree to traverse the whole tree
                node = getRoot(node)
            }
        }
        
        if(node.isLeaf==true) {
            var newItem = {};
            newItem.id = node.id;
            newItem.preOrPost = preOrPost;
            leafArray.push(newItem);
        }
        
        for(var i = 0; i<node.children.length; i++) {
            leafArray.concat(getLeafArray(node.children[i],leafArray,false,preOrPost));
        }

        return leafArray;
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

    function getTreeData(preOrPost) {
        var treeData;
        if(preOrPost == "pre") {
            treeData = my.preTreeData();
        } else {
            treeData = my.postTreeData();
        } 
        return treeData
    }

    function getOther(preOrPost) {
        //covered in qUnit
        if(preOrPost.toLowerCase()=="pre") {
            return "post";
        } else if (preOrPost.toLowerCase()=="post") {
            return "pre";
        } else {
            var err = new Error();
            err.message = 'invalid input';
            throw err;
        }
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

    function getYPosition(d,searchTermWidth,depthWidths,preOrPost) {
        //Calculates horizontal position of this node, given the information about how much space each level in the tree needs
        
        // ----------------------------------------- width -----------------------------------------------------------------//
        // -- margin -- //----------------------- availableSpace ---------------------------------------------//---margin---//
                        //------- spaceForPreTree ---------//- searchTermWidth -//-- spaceForPostTree --------//
                        //-- depth[2] --//--- depth [1] ---//- searchTermWidth -//-- depth[1] --//- depth[2] -//
                        //-------preVisWidth --------------//------------postVisWidth-------------------------//

        var yPosition = 0;
            for (var i = d.depth ; i > 0; i--) {
                    yPosition += depthWidths[i];
            }

        if(preOrPost == "pre") {
            return my.width()/2 - yPosition - searchTermWidth;
        }
        else {
            return yPosition;
        }
    }
    
    function getSpaceForTree (searchTermWidth) {
        var margins = my.margins();
        var availableSpace = my.width() - (margins[1] + margins[3])
        var spaceForTree = (availableSpace - searchTermWidth)/2;
        return spaceForTree;
    }

    function drawNodes(d3NodeData,preOrPost,dragBehaviour,source,duration) {
        addNewNodes(d3NodeData,preOrPost,dragBehaviour,source);
        transitionExistingNodes(d3NodeData);
        removeOldNodes(d3NodeData,duration,source);
    }

    function drawLinks(d3LinkData,preOrPost,duration,source) {

        addNewLinks(d3LinkData,preOrPost,duration,source);
        transitionExistingLinks(d3LinkData,duration);
        removeOldLinks(d3LinkData,source,duration);

    }

    function addNewNodes(nodes,preOrPost,dragBehaviour,source) {
        
        //Add an svg group with the interactive behaviour and the appropriate position
        var onClickBehaviour = my.onClick();
        var mouseoverText = my.mouseoverText();
        
        var nodeEnter = nodes.enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .attr("onmouseover", function(d,i) {return "showDragAffordance(" + d.id + "," + d.x + "," + d.y + ",'" + preOrPost + "')";})
                .attr("onmouseout", function() {return "hideDragAffordance()"; })
                .on("click", onClickBehaviour);
        
        //Add the circle
        nodeEnter.append("svg:circle")
            .attr("r", 1e-6)
            .call(dragBehaviour)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
        
        //Add the text at the appropriate position, size and drag behaviour. id is used to find and highlight the node during drag
        nodeEnter.append("svg:text")
                .attr("x", function(d) { return (preOrPost == "pre") ? 10 : -10; })
                .attr("dy", ".35em")
                .attr("text-anchor", function(d) { return (preOrPost == "pre") ? "start" : "end"; })
                .attr("font-size",function(d) { return getFontSize(d.value,my.maxSize(),my.textSizeMultiplier())})
                .attr("opacity",function(d) { return Math.sqrt(d.value/my.maxSize())>0.25 ? 1 : 0.5 })
                .attr("id", function(d) { return preOrPost == "pre" ? preOrPost + "-" + d.id : (d.depth == 0 ? "rootnode" : "post-" + d.id); })
                .text(function(d) { return getNodeText(d,preOrPost);})
                .call(dragBehaviour)
                .style("fill-opacity", 1e-6)
            .append("svg:title")
                .text(mouseoverText);
    }

    function getNodeText(d,preOrPost) {
        var result = "";
        var name = "";
        if (d.pluralAndSingular) { //If we have plural and singular forms on the same branch (i.e. ball and balls) then we should show ball(s)
            name = d.ambiguousName;
        } else {
            name = d.cleanName;
        }
        name = name.replace(/_/g,' '); //substitute any underscores with spaces (for multi-word search terms)
        if (d.depth == 0 && preOrPost == "pre") { //don't show the search term on the preTree, because its already present on the postTree
            result = "";
        } else {
            result = name;
        }
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
    
    function doSearch(searchTerm) {
	search(searchTerm,function(error,errorText,postTree,preTree,data) { 
		if(error)
			{
				d3.select("#errorDiv").html(errorText).show().fadeOut(2000);
			}
		else
			
			postTreeData = postTree;
			preTreeData = preTree;		
			rawData = data;
			redraw(preTreeData,postTreeData);

	});
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

    function addNewLinks(d3LinkData,preOrPost,duration,source) {

        // Enter any new links at the parent's previous position.
        d3LinkData.enter().insert("svg:path", "g")
                .attr("class", "link")
                .attr("opacity", function(d) { return d.target.cleanName == "" ? 0 : 0.2; })
                .attr("id",function(d) { return preOrPost + "-link-" + d.target.id; })
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

function DataTree(originalPhrase,phrase,value,matchingTermIndex,depth,maxDepth) {
    //covered by qUnit
    this.name;
    this.cleanName;
    this.value = value;
    this.matchingTermIndex = matchingTermIndex.toString();
    this.children = [];
    this.isLeaf = false;
    this.depth = depth;
    
    this.name = originalPhrase;
    this.cleanName = phrase[0];
    phrase.shift();

    if (phrase.length != 0 && depth < maxDepth) {
        this.children.push(new DataTree(originalPhrase,phrase,value,matchingTermIndex,this.depth+1,maxDepth));
    } else {
        this.isLeaf = true;
    }
   
}

DataTree.prototype.getChildIndex = function(Name) {
    //covered by qUnit
    result = -1;
    for(var i=0;i<this.children.length;i++)
    {
        if (this.children[i].cleanName == Name) {
            result = i; 
            break; 
        }
        if (this.children[i].cleanName + 's' == Name) {
            result = i;
            this.children[i].pluralAndSingular = true;
            this.children[i].ambiguousName = this.children[i].cleanName + "(s)";
            break;
        }
        if (this.children[i].cleanName == Name + 's') {
            result = i;
            this.children[i].pluralAndSingular = true;
            this.children[i].ambiguousName = this.children[i].cleanName.substr(0,this.children[i].cleanName.length-1) + "(s)";
            break;
        }
    }
    return result;
};

    var userDragging = false;

    var nodeIDCounter = 0;

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });
        
})();
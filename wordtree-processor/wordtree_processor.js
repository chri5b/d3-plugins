(function() {

// inspired by http://www-958.ibm.com/software/data/cognos/manyeyes/page/Word_Tree.html
// derived from http://mbostock.github.com/d3/talk/20111018/tree.html

    d3.wordtree_processor = function(data,searchTerm,nameAccessor,valueAccessor,maxResults,maxDepth){

        if(!searchTerm) {searchTerm = data[0].name.split(' ')[0] };
        if(!nameAccessor) { nameAccessor = function(d) { return d.name;} };
        if(!valueAccessor) { valueAccessor = function(d) { return d.value;} };
        if(!maxResults) { maxResults = 40; };
        if(!maxDepth) { maxDepth = 20; };

        return createTree(data,searchTerm,nameAccessor,valueAccessor,maxResults,maxDepth);

    };

    function createTree(matchingTerms, searchTerm, nameAccessor,valueAccessor,maxResults,maxDepth) {
        //partially covered in qUnit
        var tree = [];
        var treeData = [];
        var error = false;
        var errorText = "";

        var relevantData = extractRelevantData(matchingTerms,maxResults,nameAccessor,valueAccessor);

        if (searchTerm.indexOf(' ') != -1) {
            handleSpacesInMultiWordSearchTerm(searchTerm,relevantData)
            searchTerm = searchTerm.replace(/ /g,"_");
        }

        processTreeData(relevantData,searchTerm,treeData);

        tree = nestTreeData(treeData,searchTerm,maxDepth);
        if (tree == undefined) {
            error=true;
            errorText="Failed to process treeData";
        }

        return tree;
    }

    function processTreeData(matchingTerms,searchTerm,treeData) {
        //covered in qUnit
        //We're going to draw two trees, so we need two sets of data, one for the tree which precedes the search term, one for the tree which follows it.
        //We also prune the phrases, lowercase them, and remove trailing punctuation.
        //input (ignoring value)
        //  searchTerm: 		tennis
        //  matchingTerms[0]: 	tennis ball - goes straight into post tree
        //  matchingTerms[1]: 	bouncy, tennis ball - goes into both trees but needs to be pruned each way
        //  matchingTerms[2]: 	all I want is Tennis! - goes into pre-tree, but needs to be reversed because both trees expects the search term to be the first word
        //output (ignoring value)
        //  treeData :		[['tennis','ball'],['tennis','ball']]

        for(var i = 0; i < matchingTerms.length ; i++) {
            if(matchingTerms[i]) {
                matchingTerms[i].cleanName = matchingTerms[i].name.toString().split(' ');
                for(var j = 0 ; j< matchingTerms[i].cleanName.length ; j++) {
                    matchingTerms[i].cleanName[j] = removeTrailingPunctuation(matchingTerms[i].cleanName[j]);
                }

                //If the last word isn't the search term then put it into pre-Tree
                if(lastWordIsNotSearchTerm(matchingTerms[i].cleanName,searchTerm)) {
                    var term = createTerm(matchingTerms[i],i,searchTerm,false);
                    treeData.push(term);
                }
                /*
                //If the first word isn't the search term, then put it into post-Tree
                if(firstWordIsNotSearchTerm(matchingTerms[i].cleanName,searchTerm)) {
                    var postTerm = createTerm(matchingTerms[i],i,searchTerm,true);
                    preTreeData.push(postTerm);
                }
                */
            }
        }
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

    function extractRelevantData(inputData,maxResults,nameAccessor,valueAccessor) {
        var extractedData = [];
        var iteratorLimit = Math.min(inputData.length,maxResults);
        var nameAccessFunction = nameAccessor;
        var valueAccessFunction = valueAccessor;

        for(var i = 0 ; i < iteratorLimit ; i++ ) {
            var newItem = {};
            newItem.name = nameAccessFunction(inputData[i]);
            newItem.value = valueAccessFunction(inputData[i]);
            extractedData.push(newItem);
        }
        return extractedData;
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

    function nestTreeData(inputData,searchTerm,maxDepth) {
        //covered by qUnit
        //assuming pruned and cleaned input data with name as an array of words making up the phrase
        var result = [];

        //for each matching term, make a data tree
        for(var i=0;i<inputData.length;i++) {
            result[i] = new DataTree(inputData[i].name, inputData[i].cleanName, inputData[i].value, inputData[i].matchingTermIndex,0,maxDepth);
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

    function removeTrailingPunctuation(word) {
        //covered by qunit
        if(word != null) {
            return word.replace(/[?:!.,;']*$/,"").toLowerCase();
        }
        return null;
    }

})()
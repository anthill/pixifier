/** @jsx React.DOM */

var MainView = React.createClass({
  getInitialState: function() {
    return {data: null, labels: [], index: 0};
  },
  componentDidMount: function() {

    var that = this; 
    
    $.ajax({
      type: 'GET',
      url: '/validate',
      contentType: 'application/json',
      success: function(data) {
        var labels = [];
        data.forEach(function(object){
          if(labels.indexOf(object.className) == -1)
            labels.push(object.className);
        });
        labels.sort();
        this.setState({data: data, labels: labels});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(status, err.toString());
      }.bind(this)
    });
  },
  selectTab: function(tab){
    this.setState({index: tab});
  },
  render: function() {
    if(this.state.data === null) 
      return (<h4>Loading results...</h4>);
    var that = this;
    var labels = this.state.labels;
    var scores = [];
    var length = [];
    labels.forEach(function(label){
      scores.push(0);
      length.push(0);
    });
   
    //List
    var contentJSX = this.state.data.map(function(object){

      // Average ratio of positive classfications
      var idCat = labels.indexOf(object.className);
      if(idCat > -1){
        ++length[idCat];
      }
      var probs = [];
      var max = 0;
      for(var i=0; i<labels.length; ++i){
        var prob = Math.floor(parseFloat(object.output.w[i.toString()])*100);
        if(prob > max) max = prob;
        probs.push(prob);
      }
      for(var i=0; i<labels.length; ++i){
        if(probs[i] === max && object.className === labels[i]) ++scores[i];
      }

      if(object.className === labels[that.state.index]){
        
        var statsJSX = [];
        for(var i=0; i<labels.length; ++i){
          if(probs[i] === max){
            statsJSX.push(<li><strong>{labels[i]+": "+probs[i].toString()+"%"}</strong></li>);            
          }
          else 
            statsJSX.push(<li>{labels[i]+": "+probs[i].toString()+"%"}</li>);
        }

        return (
          <div className="col-xs-3 col-lg-6">
            <div className="thumbnail center-block">
              <img width="160px" src={object.path.replace("/pixifier/app","")} />
              <div className="caption">
                <ul className="center">
                {statsJSX}
                </ul>
              </div>
            </div>
          </div>);
      }
    });
     // Tabs
    var tabJSX = labels.map(function(label, index){
      var stat = (length[index]===0)?0:scores[index]/length[index];
      stat = Math.floor(stat * 100);
      return (<li role="presentation" className={(index===that.state.index)?"active":""}><a href="#" onClick={that.selectTab.bind(that,index)}><h3>{label} <small>({stat}%)</small></h3></a></li>);
    });
   
    return(
      <div className="container">
        <br/>
        <ul className="nav nav-tabs">
         {tabJSX}
        </ul>
        <div className="row">
          {contentJSX}
        </div>
      </div>
   );
  }
});

React.render(
  <MainView />,
  document.body
);

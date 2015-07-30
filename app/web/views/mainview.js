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
    // Tabs
    var tabJSX = labels.map(function(label, index){
      return (<li role="presentation" className={(index===that.state.index)?"active":""}><a href="#" onClick={that.selectTab.bind(that,index)}><h3>{label}</h3></a></li>);
    });
    //List
    var contentJSX = this.state.data.map(function(object){
      if(object.className === labels[that.state.index]){
        var statsJSX = [];
        for(var i=0; i<labels.length; ++i){
          statsJSX.push(<li>{labels[i]+": "+(Math.floor(parseFloat(object.output.w[i.toString()])*100)).toString()+"%"}</li>);
        }
        return (
          <div className="col-xs-3 col-lg-6">
            <div className="thumbnail center-block">
              <img width="160px" src={object.path.replace("/pixifier/app","")} />
              <div className="caption">
                <ul>
                {statsJSX}
                </ul>
              </div>
            </div>
          </div>);
      }
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

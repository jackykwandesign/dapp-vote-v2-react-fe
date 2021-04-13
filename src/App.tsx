import React from 'react';
import Header from './components/header/header';
import Vote from './components/vote';
import {
  BrowserRouter as Router,
  // Router,
  Switch,
  Route,
  Redirect
} from "react-router-dom";
import MyContractVotes from './components/myVotes';
import OrganizeNewVote from './components/organizeVote';
import VoteDetail from './components/voteDetail';
function App() {
  return (
    <div className="App">
      
      <Router>
        <Header />
        <Switch>
          <Route path="/myContractVotes">
              <MyContractVotes />
          </Route>
          <Route path="/organizeNewVote">
              <OrganizeNewVote />
          </Route>
          <Route exact path="/voteDetail/:voteID" 
            component={VoteDetail}>
          </Route>
          {/* <Route path="/voteDetail/:voteID">
              <VoteDetail />
          </Route> */}
          {/* VoteDetail */}
          {/* OrganizeNewVote */}
        </Switch>
      </Router>
      <br/>
      {/* <Vote /> */}
    </div>
  );
}

export default App;

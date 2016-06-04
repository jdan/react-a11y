var React = require('react');
var ReactDOM = require('react-dom');
var assert = require('assert');
var a11y = require('../index');
var assertions = require('../assertions');
var _after = require('../after');

var k = () => {};

var setUpWarnProxy = () => {
  var _warn = console.warn;
  var msgs = {};
  console.warn = (id, msg, srcNode) => {
    msgs[msg] = srcNode ? srcNode : true;
  };

  return () => {
    console.warn = _warn;
    return msgs;
  };
};

var captureWarnings = (fn) => {
  var revert = setUpWarnProxy();
  fn();
  return revert();
};

var assertWarningsInclude = (msgs, expected) => {
  assert(msgs[expected], `Did not get expected warning "${expected}"\ngot these warnings:\n${Object.keys(msgs).join('\n')}`);
};

var assertWarningsDoNotInclude = (msgs, notExpected) => {
  assert(msgs[notExpected] == null, `Did not get expected warning "${notExpected}"\ngot these warnings:\n${Object.keys(msgs).join('\n')}`);
};

var expectWarning = (expected, fn) => {
  var msgs = captureWarnings(fn);
  assertWarningsInclude(msgs, expected);
};

var doNotExpectWarning = (notExpected, fn) => {
  var msgs = captureWarnings(fn);
  assertWarningsDoNotInclude(msgs, notExpected);
};

describe('a11y', () => {
  describe('#restoreAll', () => {
    let restorePatchedMethods;
    let createElement;

    beforeEach(() => {
      restorePatchedMethods = _after.restorePatchedMethods;
      createElement = React.createElement;
    });

    afterEach(() => {
      _after.restorePatchedMethods = restorePatchedMethods;
      React.createElement = createElement;
    });

    it('restores React.createElement', () => {
      a11y(React);
      assert(createElement !== React.createElement);
      a11y.restoreAll();
      assert(createElement === React.createElement);
    });

    it('calls after.restorePatchedMethods()', () => {
      let called = false;
      _after.restorePatchedMethods = () => called = true;
      a11y.restoreAll();
      assert(called);
    });
  });
});

describe('props', () => {
  before(() => {
    a11y(React, { ReactDOM });
  });

  after(() => {
    a11y.restoreAll();
  });

  describe('onClick', () => {
    describe('when role="button"', () => {
      it('requires onKeyDown', () => {
        expectWarning(assertions.props.onClick.BUTTON_ROLE_SPACE.msg, () => {
          <span onClick={k} role="button"/>;
        });
      });

      it('requires onKeyDown', () => {
        expectWarning(assertions.props.onClick.BUTTON_ROLE_ENTER.msg, () => {
          <span onClick={k} role="button"/>;
        });
      });
    });

    it('warns without role', () => {
      expectWarning(assertions.props.onClick.NO_ROLE.msg, () => {
        <div onClick={k}/>;
      });
    });

    it('does not warn with role', () => {
      doNotExpectWarning(assertions.props.onClick.NO_ROLE.msg, () => {
        <div onClick={k} role="button"/>;
      });
    });

    it('does not warn with no role and `aria-hidden="true"`', () => {
      doNotExpectWarning(assertions.props.onClick.NO_ROLE.msg, () => {
        <a aria-hidden="true" onClick={k}/>;
      });
    });
  });

  describe('tabIndex', () => {
    describe('when element is not interactive', () => {
      it('warns without tabIndex', () => {
        expectWarning(assertions.props.onClick.NO_TABINDEX.msg, () => {
          <div onClick={k}/>;
        });
      });

      it('does not warn when tabIndex is present', () => {
        doNotExpectWarning(assertions.props.onClick.NO_TABINDEX.msg, () => {
          <div onClick={k} tabIndex="0"/>;
        });
      });

      it('does not warn when tabIndex is present', () => {
        doNotExpectWarning(assertions.props.onClick.NO_TABINDEX.msg, () => {
          <div onClick={k} tabIndex={0}/>;
        });
      });
    });

    describe('when element is interactive', () => {
      it('does not warn about tabIndex with a[href]', () => {
        doNotExpectWarning(assertions.props.onClick.NO_TABINDEX.msg, () => {
          <a onClick={k} href="foo"/>;
        });
      });

      it('does not warn about buttons', () => {
        doNotExpectWarning(assertions.props.onClick.NO_TABINDEX.msg, () => {
          <button onClick={k}/>;
        });
      });
    });
  });

  describe('aria-hidden', () => {
    describe('when set to `true`', () => {
      it('warns when applied to an interactive element without `tabIndex="-1"`', () => {
        expectWarning(assertions.props['aria-hidden'].TABINDEX_REQUIRED_WHEN_ARIA_HIDDEN.msg, () => {
          <a aria-hidden="true" href="/foo"/>;
        });
      });

      it('warns when applied to an interactive element with `tabIndex="0"`', () => {
        expectWarning(assertions.props['aria-hidden'].TABINDEX_REQUIRED_WHEN_ARIA_HIDDEN.msg, () => {
          <a aria-hidden="true" tabIndex="0"/>;
        });
      });

      it('does not warn when applied to a placeholder link', () => {
        expectWarning(assertions.props['aria-hidden'].TABINDEX_REQUIRED_WHEN_ARIA_HIDDEN.msg, () => {
          <a aria-hidden="true"/>;
        });
      });

      it('does not warn when applied to an interactive element with `tabIndex="-1"`', () => {
        doNotExpectWarning(assertions.props['aria-hidden'].TABINDEX_REQUIRED_WHEN_ARIA_HIDDEN.msg, () => {
          <a aria-hidden="true" tabIndex="-1"/>;
        });
      });

      it('does not warn when applied to a non-interactive element', () => {
        doNotExpectWarning(assertions.props['aria-hidden'].TABINDEX_REQUIRED_WHEN_ARIA_HIDDEN.msg, () => {
          <div aria-hidden="true"/>;
        });
      });
    });

    describe('when set to `false`', () =>{
      it('does not warn when applied to an interactive element with `tabIndex="-1"`', () => {
        doNotExpectWarning(assertions.props['aria-hidden'].TABINDEX_REQUIRED_WHEN_ARIA_HIDDEN.msg, () => {
          <a aria-hidden="false" tabIndex="-1"/>;
        });
      });
    });
  });
});

describe('tags', () => {
  before(() => {
    a11y(React, { ReactDOM });
  });

  after(() => {
    a11y.restoreAll();
  });

  describe('img', () => {
    it('requires alt attributes', () => {
      expectWarning(assertions.tags.img.MISSING_ALT.msg, () => {
        <img src="foo.jpg"/>;
      });
    });

    it('ignores proper alt attributes', () => {
      doNotExpectWarning(assertions.tags.img.MISSING_ALT.msg, () => {
        <img src="foo.jpg" alt="a foo, ofc"/>;
      });
    });

    it('dissallows the word "image" in the alt attribute', () => {
      expectWarning(assertions.tags.img.REDUNDANT_ALT.msg, () => {
        <img src="cat.gif" alt="image of a cat"/>;
      });
    });

    it('dissallows the word "picture" in the alt attribute', () => {
      expectWarning(assertions.tags.img.REDUNDANT_ALT.msg, () => {
        <img src="cat.gif" alt="picture of a cat"/>;
      });
    });
  });

  describe('a', () => {
    describe('placeholder links without href', () => {
      it('does not warn', () => {
        doNotExpectWarning(assertions.tags.a.HASH_HREF_NEEDS_BUTTON.msg, () => {
          <a class="foo"/>;
        });
      });
    });

    describe('placeholder links without tabindex', () => {
      it('does not warn', () => {
        doNotExpectWarning(assertions.tags.a.TABINDEX_NEEDS_BUTTON.msg, () => {
          <a class="foo"/>;
        });
      });
    });

    describe('with [href="#"]', () => {
      it('warns', () => {
        expectWarning(assertions.tags.a.HASH_HREF_NEEDS_BUTTON.msg, () => {
          <a onClick={k} href="#"/>;
        });
      });
    });

    describe('with [tabIndex="0"] and no href', () => {
      it('warns', () => {
        expectWarning(assertions.tags.a.TABINDEX_NEEDS_BUTTON.msg, () => {
          <a onClick={k} tabIndex="0"/>;
        });
      });
    });

    describe('with a real href', () => {
      it('does not warn', () => {
        doNotExpectWarning(assertions.tags.a.HASH_HREF_NEEDS_BUTTON.msg, () => {
          <a onClick={k} href="/foo/bar"/>;
        });
      });
    });
  });
});

describe('labels', () => {
  var fixture;

  var expectLabelWarning = (renderFn, done) => {
    var revert = setUpWarnProxy();

    var Wrapper = React.createClass({
      componentDidMount() {
        var msgs = revert();
        assertWarningsInclude(msgs, assertions.render.NO_LABEL.msg);
        done();
      },

      render() {
        return renderFn();
      },
    });

    ReactDOM.render(<Wrapper />, fixture);
  };

  var doNotExpectLabelWarning = (renderFn, done) => {
    var revert = setUpWarnProxy();

    var Wrapper = React.createClass({
      componentDidMount() {
        var msgs = revert();
        assertWarningsDoNotInclude(msgs, assertions.render.NO_LABEL.msg);
        done();
      },

      render() {
        return renderFn();
      },
    });

    ReactDOM.render(<Wrapper />, fixture);
  };

  before(() => {
    a11y(React, { ReactDOM });
  });

  after(() => {
    a11y.restoreAll();
  });

  beforeEach(() => {
    fixture = document.createElement('div');
    fixture.id = 'fixture-1';
    document.body.appendChild(fixture);
  });

  afterEach(() => {
    fixture = document.getElementById('fixture-1');
    if (fixture)
      document.body.removeChild(fixture);
  });

  it('warns if there is no label on an interactive element', (done) => {
    expectLabelWarning(() => <button/>, done);
  });

  it('warns if there is no label on a placeholder link', (done) => {
    expectLabelWarning(() => <a/>, done);
  });

  it('does not warn if the element has an explicit label tag', (done) => {
    doNotExpectLabelWarning(() => {
      return <div>
        <label htmlFor="username">Username</label>
        <input id="username" />
      </div>;
    }, done);
  });

  it('warns if the element does not have an explicit label tag', (done) => {
    expectLabelWarning(() => {
      return <div>
        <label htmlFor="username">Username</label>
        <input id="username-not" />
      </div>;
    }, done);
  });

  it('does not warn when a placeholder link has a label', (done) => {
    doNotExpectLabelWarning(() => <a>foo</a>, done);
  });

  it('warns if there is no label on an element with an ARIA role', (done) => {
    expectLabelWarning(() => <span role="button"/>, done);
  });

  it('does not warn when `role="presentation"`', (done) => {
    doNotExpectLabelWarning(() => <img role="presentation"/>, done);
  });

  it('does not warn when `role="none"`', (done) => {
    doNotExpectLabelWarning(() => <img role="none"/>, done);
  });

  it('does not warn when `aria-hidden="true"`', (done) => {
    doNotExpectLabelWarning(() => <button aria-hidden="true"/>, done);
  });

  it('warns when `aria-hidden="false"`', (done) => {
    expectLabelWarning(() => <button aria-hidden="false"/>, done);
  });

  it('does not warn if the element is not interactive', (done) => {
    doNotExpectLabelWarning(() => <div/>, done);
  });

  it('does not warn if there is an aria-label', (done) => {
    doNotExpectLabelWarning(() => <button aria-label="foo"/>, done);
  });

  it('does not warn if there is an aria-labelledby', (done) => {
    doNotExpectLabelWarning(() => <button aria-labelledby="foo"/>, done);
  });

  it('does not warn if there are text node children', (done) => {
    doNotExpectLabelWarning(() => <button>foo</button>, done);
  });

  it('does not warn if there are deeply nested text node children', (done) => {
    doNotExpectLabelWarning(() => {
      return <button><span><span>foo</span></span></button>;
    }, done);
  });

  it('does not error if there are undefined children', (done) => {
    var undefChild;
    doNotExpectLabelWarning(() => {
      return <button>{ undefChild } bar</button>;
    }, done);
  });

  it('does not error if there are null children', (done) => {
    doNotExpectLabelWarning(() => {
      return <button>bar { null }</button>;
    }, done);
  });

  it('does not warn if there is an image with an alt attribute', (done) => {
    doNotExpectLabelWarning(() => {
      return <button><img src="#" alt="Foo"/></button>;
    }, done);
  });

  it('warns if an image without alt is the only content', (done) => {
    expectLabelWarning(() => {
      return <button><img src="#" alt=""/></button>;
    }, done);
  });

  it('does not warn if an image without alt is accompanied by text', (done) => {
    doNotExpectLabelWarning(() => {
      return <button>foo <img src="#" alt=""/></button>;
    }, done);
  });

  it('does not warn if a hidden input', (done) => {
    doNotExpectLabelWarning(() => {
      return <input type="hidden"/>;
    }, done);
  });

  it('warns if a visible input', (done) => {
    expectLabelWarning(() => <input type="text"/>, done);
  });

  it('warns if an anchor has a tabIndex but no href', (done) => {
    expectLabelWarning(() => <a tabIndex="0"/>, done);
  });

  it('warns if an anchor has an href', (done) => {
    expectLabelWarning(() => <a href="/foo"/>, done);
  });

  it('does not warn when the label text is inside a child component', (done) => {
    var Foo = React.createClass({
      render: function() {
        return (
          <div className="foo">
            <span><span>foo</span></span>
          </div>
        );
      }
    });

    doNotExpectLabelWarning(() => {
      return <div role="button"><span><Foo/></span></div>;
    }, done);
  });

  it('does not warn when the label is an image with alt text', (done) => {
    var Foo = React.createClass({
      render: function() {
        return (
          <img alt="foo"/>
        );
      }
    });

    doNotExpectLabelWarning(() => {
      return <div role="button"><Foo/></div>;
    }, done);
  });

  it('warns when the label is an image without alt text', (done) => {
    expectLabelWarning(() => {
      return <div role="button"><img alt=""/></div>;
    }, done);
  });

  it('does not warn when the label is an image with alt text nested inside a child component', (done) => {
    var Foo = React.createClass({
      render: function() {
        return (
          <div className="foo">
            <span><span><img alt="foo"/></span></span>
          </div>
        );
      }
    });

    doNotExpectLabelWarning(() => {
      return <div role="button"><span><Foo/></span></div>;
    }, done);
  });

  it('warns when an image without alt text is nested inside a child component', (done) => {
    var Foo = React.createClass({
      render: function() {
        return (
          <div className="foo">
            <span><span><img/></span></span>
          </div>
        );
      }
    });

    expectLabelWarning(() => {
      return <div role="button"><span><Foo/></span></div>;
    }, done);
  });
//
//  it('does not warn when there is an image without alt text with a sibling text node', (done) => {
//    var Foo = React.createClass({
//      render: function() {
//        return (
//          <div className="foo">
//            <span><span>Foo <img/></span></span>
//          </div>
//        );
//      }
//    });
//
//    doNotExpectLabelWarning(() => {
//      ReactDOM.render(<div role="button"><span><Foo/></span></div>, fixture);
//    }, done);
//  });
//
//  it('warns when a child is a component without text content', (done) => {
//    var Bar = React.createClass({
//      render: () => {
//        return (
//          <div className="bar"></div>
//        );
//      }
//    });
//
//    expectLabelWarning(() => {
//      ReactDOM.render(<div role="button"><Bar/></div>, fixture);
//    }, done);
//  });
//
//  it('does not warn as long as one child component has label text', (done) => {
//    var Bar = React.createClass({
//      render: () => {
//        return (
//          <div className="bar"></div>
//        );
//      }
//    });
//
//    var Foo = React.createClass({
//      render: function() {
//        return (
//          <div className="foo">
//            <span><span>foo</span></span>
//          </div>
//        );
//      }
//    });
//
//    doNotExpectLabelWarning(() => {
//      ReactDOM.render(<div role="button"><Bar/><Foo/></div>, fixture);
//    }, done);
//  });
//
//  it('warns if no child components have label text', (done) => {
//    var Bar = React.createClass({
//      render: () => {
//        return (
//          <div className="bar"></div>
//        );
//      }
//    });
//
//    var Foo = React.createClass({
//      render: function() {
//        return (
//          <div className="foo"></div>
//        );
//      }
//    });
//
//    expectLabelWarning(() => {
//      ReactDOM.render(<div role="button"><Bar/><div/><Foo/></div>, fixture);
//    }, done);
//  });
//
//  it('does not error when the component has a componentDidMount callback', (done) => {
//    var Bar = React.createClass({
//      _privateProp: 'bar',
//
//      componentDidMount: function() {
//        return this._privateProp;
//      },
//      render: () => {
//        return (
//          <div className="bar"></div>
//        );
//      }
//    });
//
//    expectLabelWarning(() => {
//      ReactDOM.render(<div role="button"><Bar/></div>, fixture);
//    }, done);
//  });
//
//  it('does not warn when the label is a number', (done) => {
//    doNotExpectLabelWarning(() => {
//      <a>{1111}</a>;
//    }, done);
//  });
});

describe('includeSrcNode is "asString"', () => {
  var fixture;

  before(() => {
    a11y(React, { includeSrcNode: "asString" });
    fixture = document.createElement('div');
    fixture.id = 'fixture-1';
    document.body.appendChild(fixture);
  });

  after(() => {
    a11y.restoreAll();
    fixture = document.getElementById('fixture-1');
    if (fixture)
      document.body.removeChild(fixture);
  });

  it('returns the outerHTML as a string in the error message', () => {
    var Bar = React.createClass({
      _privateProp: 'bar',

      componentDidMount: function() {
        return this._privateProp;
      },
      render: () => {
        return (
          <div role="button"></div>
        );
      }
    });

    var msgs = captureWarnings(() => {ReactDOM.render(<Bar/>, fixture);});
    var regex = /^Source Node: <(\w+) .+>.*<\/\1>/;
    var matches = msgs[assertions.render.NO_LABEL.msg].match(regex);
    assert.equal(matches[1], "div");
  });
});

describe('filterFn', () => {
  before(() => {
    var barOnly = (name, id, msg) => {
      return id === "bar";
    };

    a11y(React, { filterFn: barOnly });
  });

  after(() => {
    a11y.restoreAll();
  });

  describe('when the source element has been filtered out', () => {
    it('does not warn', () => {
      doNotExpectWarning(assertions.tags.img.MISSING_ALT.msg, () => {
        <img id="foo" src="foo.jpg"/>;
      });
    });
  });

  describe('when there are filtered results', () => {
    it('warns', () => {
      expectWarning(assertions.tags.img.MISSING_ALT.msg, () => {
        <div>
          <img id="foo" src="foo.jpg"/>
          <img id="bar" src="foo.jpg"/>
        </div>;
      });
    });
  });
});

describe('device is set to mobile', () => {
  before(() => {
    a11y(React, { device: ['mobile'] });
  });

  after(() => {
    a11y.restoreAll();
  });

  describe('when role="button"', () => {
    it('does not require onKeyDown', () => {
      doNotExpectWarning(assertions.props.onClick.BUTTON_ROLE_SPACE.msg, () => {
        <span onClick={k} role="button"/>;
      });
    });

    it('does not require onKeyDown', () => {
      doNotExpectWarning(assertions.props.onClick.BUTTON_ROLE_ENTER.msg, () => {
        <span onClick={k} role="button"/>;
      });
    });
  });
});

describe('exclusions', () => {
  before(() => {
    a11y(React, { exclude: ['REDUNDANT_ALT'] });
  });

  after(() => {
    a11y.restoreAll();
  });

  describe('when REDUNDANT_ALT is excluded', () => {
    it('does not warn when the word "image" in the alt attribute', () => {
      doNotExpectWarning(assertions.tags.img.REDUNDANT_ALT.msg, () => {
        <img src="cat.gif" alt="image of a cat"/>;
      });
    });
  });
});

describe('warningPrefix', () => {
  let warningPrefix = 'react-a11y ERROR:';
  before(() => {
    a11y(React, { warningPrefix });
  });

  after(() => {
    a11y.restoreAll();
  });

  it('adds the prefix to each warning message', () => {
    expectWarning(warningPrefix + assertions.tags.img.MISSING_ALT.msg, () => {
      <div>
        <img id="foo" src="foo.jpg"/>
        <img id="bar" src="foo.jpg"/>
      </div>;
    });
  });
});

//describe('testing children', () => {
//  before(() => {
//    a11y(React, { exclude: ['REDUNDANT_ALT'] });
//  });
//
//  after(() => {
//    a11y.restoreAll();
//  });
//
//  describe('when children is passed down in props', () => {
//    it('calls each test with the children', () => {
//      doNotExpectWarning(assertions.render.NO_LABEL.msg, () => {
//        React.createElement('a', {href: 'google.com', children: 'Google'});
//      });
//    });
//  });
//
//  describe('when children is passed down separately from props', () => {
//    it('calls each test with the children', () => {
//      doNotExpectWarning(assertions.render.NO_LABEL.msg, () => {
//        React.createElement('a', {href: 'google.com'}, 'Google');
//      });
//    });
//  });
//});

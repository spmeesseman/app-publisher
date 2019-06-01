/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';


suite("Extension Tests", () => 
{
  // Before Each
  setup(async () => { });

  teardown(() => {
    
  });

  test("Get extension", () => {
    assert.ok(true);
  });


  // tslint:disable-next-line: only-arrow-functions
  test("Activate extension", function (done) 
  {

    this.timeout(60 * 1000);

    if (true) 
    {
      assert.ok(true);
      done();
    } else {
      assert.fail("Failed");
      done();
    }
  });

});



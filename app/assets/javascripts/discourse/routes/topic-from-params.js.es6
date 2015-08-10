import DiscourseURL from 'discourse/lib/url';
import Draft from 'discourse/models/draft';

// This route is used for retrieving a topic based on params
export default Discourse.Route.extend({

  // Avoid default model hook
  model: function(p) { return p; },

  setupController: function(controller, params) {
    params = params || {};
    params.track_visit = true;
    var topic = this.modelFor('topic'),
        postStream = topic.get('postStream');

    var topicController = this.controllerFor('topic'),
        topicProgressController = this.controllerFor('topic-progress'),
        composerController = this.controllerFor('composer');

    // I sincerely hope no topic gets this many posts
    if (params.nearPost === "last") { params.nearPost = 999999999; }

    var self = this;
    params.forceLoad = true;
    postStream.refresh(params).then(function () {

      // TODO we are seeing errors where closest post is null and this is exploding
      // we need better handling and logging for this condition.

      // The post we requested might not exist. Let's find the closest post
      var closestPost = postStream.closestPostForPostNumber(params.nearPost || 1),
          closest = closestPost.get('post_number'),
          progress = postStream.progressIndexOfPost(closestPost);

      topicController.setProperties({
        'model.currentPost': closest,
        enteredAt: new Date().getTime().toString(),
      });

      topicProgressController.setProperties({
        progressPosition: progress,
        expanded: false
      });

      // Highlight our post after the next render
      Ember.run.scheduleOnce('afterRender', function() {
        self.appEvents.trigger('post:highlight', closest);
      });
      DiscourseURL.jumpToPost(closest);

      if (topic.present('draft')) {
        composerController.open({
          draft: Draft.getLocal(topic.get('draft_key'), topic.get('draft')),
          draftKey: topic.get('draft_key'),
          draftSequence: topic.get('draft_sequence'),
          topic: topic,
          ignoreIfChanged: true
        });
      }
    }).catch(function(e) {
      Ember.warn('Could not view topic', e);
    });
  }

});

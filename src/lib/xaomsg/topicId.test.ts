import { describe, it, expect } from 'vitest';
import { keccak256, toBytes, concat } from 'viem';
import { threadIdForShow } from './threadId';
import { contentTopicForThread, MSG_TOPIC_DOMAIN } from './topicId';

describe('contentTopicForThread', () => {
  it('returns a /xao/1/<hex>/json content topic', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    const topic = contentTopicForThread(threadIdForShow(show));
    expect(topic).toMatch(/^\/xao\/1\/[0-9a-f]{64}\/json$/);
  });

  it('is deterministic — same address → same topic', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    expect(contentTopicForThread(threadIdForShow(show))).toEqual(
      contentTopicForThread(threadIdForShow(show)),
    );
  });

  it('is opaque — topic does not contain the show address', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    const topic = contentTopicForThread(threadIdForShow(show));
    expect(topic.toLowerCase()).not.toContain(show.slice(2).toLowerCase());
  });

  it('matches the keccak256 of the domain-prefixed threadId', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    const tid = threadIdForShow(show);
    const expected = keccak256(concat([toBytes(MSG_TOPIC_DOMAIN), toBytes(tid)]));
    expect(contentTopicForThread(tid)).toEqual(`/xao/1/${expected.slice(2)}/json`);
  });
});
